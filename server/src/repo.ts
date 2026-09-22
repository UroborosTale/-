import { nanoid } from "nanoid";
import { db, logAudit } from "./db.js";
import type { ProcessLogicModel, Fragment, ValidationIssue, ChatMessage } from "./types/model.js";
import type { Idef0Result } from "./pipeline/idef0.js";

export interface SessionMeta {
  processName: string;
  department?: string;
  owner?: string;
  modelType: "AS-IS" | "TO-BE";
  decompositionDepth: number;
  notations: ("IDEF0" | "BPMN")[];
}

export interface VersionSnapshot {
  version: number;
  ts: string;
  note: string;
  model: ProcessLogicModel;
}

export interface Comment {
  id: string;
  element_id: string | null;
  text: string;
  author: string;
  ts: string;
}

export interface SessionRecord {
  id: string;
  title: string;
  mode: "A" | "B";
  status: "draft" | "processing" | "ready" | "interviewing" | "completed";
  meta: SessionMeta;
  fragments: Fragment[];
  rawText: string;
  model: ProcessLogicModel | null;
  validation: ValidationIssue[];
  bpmnXml: string | null;
  idef0: Idef0Result | null;
  chat: ChatMessage[];
  versions: VersionSnapshot[];
  comments: Comment[];
  qa: { gapId: string; question: string; answerText: string; ts: string }[];
  diagramsStale: boolean;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: any): SessionRecord {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    status: row.status,
    meta: JSON.parse(row.meta_json),
    fragments: JSON.parse(row.fragments_json),
    rawText: row.raw_text,
    model: row.model_json ? JSON.parse(row.model_json) : null,
    validation: JSON.parse(row.validation_json),
    bpmnXml: row.bpmn_xml,
    idef0: row.idef0_json ? JSON.parse(row.idef0_json) : null,
    chat: JSON.parse(row.chat_json),
    versions: JSON.parse(row.versions_json),
    comments: JSON.parse(row.comments_json),
    qa: JSON.parse(row.qa_json),
    diagramsStale: !!row.diagrams_stale,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSession(input: { title: string; mode: "A" | "B"; meta: SessionMeta }): SessionRecord {
  const id = `sess_${nanoid(10)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (id, title, mode, status, meta_json, fragments_json, raw_text, validation_json, chat_json, versions_json, comments_json, qa_json, diagrams_stale, created_at, updated_at)
     VALUES (?, ?, ?, 'draft', ?, '[]', '', '[]', '[]', '[]', '[]', '[]', 0, ?, ?)`
  ).run(id, input.title, input.mode, JSON.stringify(input.meta), now, now);
  logAudit(id, "system", "session_created", { title: input.title, mode: input.mode });
  return getSession(id)!;
}

export function getSession(id: string): SessionRecord | null {
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
  return row ? rowToRecord(row) : null;
}

export function listSessions(): SessionRecord[] {
  const rows = db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`).all();
  return rows.map(rowToRecord);
}

export function deleteSession(id: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  logAudit(id, "system", "session_deleted");
}

export interface SessionUpdate {
  title?: string;
  status?: SessionRecord["status"];
  meta?: SessionMeta;
  fragments?: Fragment[];
  rawText?: string;
  model?: ProcessLogicModel | null;
  validation?: ValidationIssue[];
  bpmnXml?: string | null;
  idef0?: Idef0Result | null;
  chat?: ChatMessage[];
  comments?: Comment[];
  qa?: SessionRecord["qa"];
  diagramsStale?: boolean;
  provider?: string | null;
}

export function updateSession(id: string, patch: SessionUpdate): SessionRecord {
  const current = getSession(id);
  if (!current) throw new Error("Session not found");
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sessions SET
      title = ?, status = ?, meta_json = ?, fragments_json = ?, raw_text = ?, model_json = ?,
      validation_json = ?, bpmn_xml = ?, idef0_json = ?, chat_json = ?, comments_json = ?, qa_json = ?,
      diagrams_stale = ?, provider = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    patch.title ?? current.title,
    patch.status ?? current.status,
    JSON.stringify(patch.meta ?? current.meta),
    JSON.stringify(patch.fragments ?? current.fragments),
    patch.rawText ?? current.rawText,
    patch.model !== undefined ? (patch.model ? JSON.stringify(patch.model) : null) : current.model ? JSON.stringify(current.model) : null,
    JSON.stringify(patch.validation ?? current.validation),
    patch.bpmnXml !== undefined ? patch.bpmnXml : current.bpmnXml,
    patch.idef0 !== undefined ? (patch.idef0 ? JSON.stringify(patch.idef0) : null) : current.idef0 ? JSON.stringify(current.idef0) : null,
    JSON.stringify(patch.chat ?? current.chat),
    JSON.stringify(patch.comments ?? current.comments),
    JSON.stringify(patch.qa ?? current.qa),
    patch.diagramsStale !== undefined ? (patch.diagramsStale ? 1 : 0) : current.diagramsStale ? 1 : 0,
    patch.provider !== undefined ? patch.provider : current.provider,
    now,
    id
  );
  return getSession(id)!;
}

export function addVersion(id: string, note: string): SessionRecord {
  const current = getSession(id);
  if (!current || !current.model) throw new Error("No model to snapshot");
  const versions = [...current.versions];
  const version = (versions[versions.length - 1]?.version ?? 0) + 1;
  versions.push({ version, ts: new Date().toISOString(), note, model: current.model });
  db.prepare(`UPDATE sessions SET versions_json = ? WHERE id = ?`).run(JSON.stringify(versions.slice(-30)), id);
  logAudit(id, "system", "version_snapshot", { version, note });
  return getSession(id)!;
}
