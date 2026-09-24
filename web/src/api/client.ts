import type { SessionListItem, SessionMeta, SessionRecord, VersionListItem } from "../types";

export interface RegistryProcess {
  id: string;
  code: string | null;
  name: string;
  level: "L0" | "L1" | "L2" | "L3";
  parent_process_id: string | null;
  classification: "main" | "support" | "management";
  owner: string | null;
  department: string | null;
  status: "draft" | "review" | "approved" | "archived";
  version: string;
  review_date: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessLink {
  id: string;
  from_process_id: string;
  to_process_id: string;
  data_label: string;
  confirmed: number | boolean;
  created_at: string;
}

export interface GlossaryEntry {
  key: string;
  kind: string;
  value: string;
  status: "proposed" | "confirmed";
}

export interface PositionRow {
  key: string;
  title: string;
  department: string | null;
}

const BASE = "/api";

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = await res.json();
      message = j.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  providerStatus: () => req<{ name: string; live: boolean }>("GET", "/provider-status"),
  templates: () => req<{ id: string; name: string; hints: string[] }[]>("GET", "/templates"),

  listSessions: () => req<SessionListItem[]>("GET", "/sessions"),
  getSession: (id: string) => req<SessionRecord>("GET", `/sessions/${id}`),
  createSession: (input: { title?: string; mode: "A" | "B"; meta: SessionMeta }) =>
    req<SessionRecord>("POST", "/sessions", input),
  patchSession: (id: string, patch: { title?: string; meta?: SessionMeta }) =>
    req<SessionRecord>("PATCH", `/sessions/${id}`, patch),
  deleteSession: (id: string) => req<void>("DELETE", `/sessions/${id}`),
  putModel: (id: string, model: SessionRecord["model"]) => req<SessionRecord>("PUT", `/sessions/${id}/model`, model),
  rebuildDiagrams: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/rebuild-diagrams`),
  addVersion: (id: string, note: string) => req<SessionRecord>("POST", `/sessions/${id}/versions`, { note }),
  listVersions: (id: string) => req<VersionListItem[]>("GET", `/sessions/${id}/versions`),
  approveVersion: (id: string, note: string, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/versions/approve`, { note, author }),
  rollbackVersion: (id: string, seq: number, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/versions/${seq}/rollback`, { author }),
  diffVersions: (id: string, a: number | string, b: number | string) => req<any>("GET", `/sessions/${id}/versions/${a}/diff/${b}`),
  addComment: (id: string, element_id: string | null, text: string, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/comments`, { element_id, text, author }),

  ingestText: (id: string, text: string, opts?: { append?: boolean; anonymize?: boolean; sourceLabel?: string }) =>
    req<SessionRecord>("POST", `/sessions/${id}/ingest-text`, { text, ...opts }),
  uploadFile: (id: string, filename: string, contentBase64: string, opts?: { append?: boolean; anonymize?: boolean }) =>
    req<SessionRecord>("POST", `/sessions/${id}/upload`, { filename, contentBase64, ...opts }),
  runPipeline: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/run`),
  answerGap: (id: string, gapId: string, answerText: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/answers`, { gapId, answerText }),

  interviewStart: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/start`),
  interviewTurn: (id: string, text: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/turn`, { text }),
  interviewFlag: (id: string, element_id: string, note?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/interview/flag-element`, { element_id, note }),
  interviewFinish: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/finish`),

  exportUrl: (id: string, path: string) => `${BASE}/sessions/${id}/export/${path}`,

  // --- М3.1 Реестр процессов ---
  listRegistry: (filters?: { level?: string; classification?: string; department?: string; status?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    return req<RegistryProcess[]>("GET", `/registry${qs ? `?${qs}` : ""}`);
  },
  createRegistryProcess: (input: Partial<RegistryProcess>) => req<RegistryProcess>("POST", "/registry", input),
  patchRegistryProcess: (id: string, patch: Partial<RegistryProcess>) => req<RegistryProcess>("PATCH", `/registry/${id}`, patch),
  deleteRegistryProcess: (id: string) => req<void>("DELETE", `/registry/${id}`),
  registryExportXlsxUrl: () => `${BASE}/registry/export/xlsx`,
  listProcessLinks: () => req<ProcessLink[]>("GET", "/registry/links"),
  createProcessLink: (input: { from_process_id: string; to_process_id: string; data_label: string; confirmed?: boolean }) =>
    req<ProcessLink>("POST", "/registry/links", input),
  confirmProcessLink: (id: string) => req<void>("PATCH", `/registry/links/${id}/confirm`),
  deleteProcessLink: (id: string) => req<void>("DELETE", `/registry/links/${id}`),
  suggestProcessLinks: () => req<{ from_process_id: string; to_process_id: string; data_label: string }[]>("GET", "/registry/links/suggest"),
  processLinkGaps: () =>
    req<{ processId: string; name: string; unconsumedOutputs: string[]; unproducedInputs: string[] }[]>("GET", "/registry/links/gaps"),

  // --- М3.5 Справочники ---
  listGlossary: (filters?: { kind?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    return req<GlossaryEntry[]>("GET", `/glossary${qs ? `?${qs}` : ""}`);
  },
  upsertGlossary: (key: string, kind: string, value: string, status?: string) =>
    req<GlossaryEntry>("PUT", `/glossary/${encodeURIComponent(key)}`, { kind, value, status }),
  deleteGlossary: (key: string) => req<void>("DELETE", `/glossary/${encodeURIComponent(key)}`),
  listGlossaryProposals: () => req<GlossaryEntry[]>("GET", "/glossary/proposals"),
  confirmGlossaryProposal: (key: string) => req<void>("POST", `/glossary/proposals/${encodeURIComponent(key)}/confirm`),
  rejectGlossaryProposal: (key: string) => req<void>("POST", `/glossary/proposals/${encodeURIComponent(key)}/reject`),
  importGlossaryFromSession: (sessionId: string) => req<{ proposed: number }>("POST", `/glossary/import-from-session/${sessionId}`),

  listPositions: () => req<PositionRow[]>("GET", "/positions"),
  upsertPosition: (key: string, title: string, department?: string) => req<PositionRow>("PUT", `/positions/${encodeURIComponent(key)}`, { title, department }),
  deletePosition: (key: string) => req<void>("DELETE", `/positions/${encodeURIComponent(key)}`),
  listRolePositionMap: () => req<{ role_key: string; position_key: string }[]>("GET", "/role-position-map"),
  addRolePositionMap: (role_key: string, position_key: string) => req<void>("POST", "/role-position-map", { role_key, position_key }),
  removeRolePositionMap: (role_key: string, position_key: string) => req<void>("DELETE", "/role-position-map", { role_key, position_key }),
  importOrgStructureCsv: (csv: string) => req<{ positions: number; departments: number; mappings: number }>("POST", "/glossary/import-orgstructure", { csv }),
};
