import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "app.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'A',
  status TEXT NOT NULL DEFAULT 'draft',
  meta_json TEXT NOT NULL DEFAULT '{}',
  fragments_json TEXT NOT NULL DEFAULT '[]',
  raw_text TEXT NOT NULL DEFAULT '',
  model_json TEXT,
  validation_json TEXT NOT NULL DEFAULT '[]',
  bpmn_xml TEXT,
  idef0_json TEXT,
  chat_json TEXT NOT NULL DEFAULT '[]',
  versions_json TEXT NOT NULL DEFAULT '[]',
  comments_json TEXT NOT NULL DEFAULT '[]',
  qa_json TEXT NOT NULL DEFAULT '[]',
  diagrams_stale INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS glossary (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT,
  ts TEXT NOT NULL
);

-- М3.1: реестр процессов портфеля (иерархия L0-L3, классификация, атрибуты)
CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'L2',
  parent_process_id TEXT,
  classification TEXT NOT NULL DEFAULT 'main',
  owner TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL DEFAULT '0.1',
  review_date TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- М3.2: подтверждённые связи между процессами (стыки вход/выход)
CREATE TABLE IF NOT EXISTS process_links (
  id TEXT PRIMARY KEY,
  from_process_id TEXT NOT NULL,
  to_process_id TEXT NOT NULL,
  data_label TEXT NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- М3.5: должности штатного расписания и отображение роль<->должность (многие-ко-многим)
CREATE TABLE IF NOT EXISTS positions (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT
);

CREATE TABLE IF NOT EXISTS role_position_map (
  role_key TEXT NOT NULL,
  position_key TEXT NOT NULL,
  PRIMARY KEY (role_key, position_key)
);
`);

export function logAudit(sessionId: string | null, actor: string, action: string, details?: unknown) {
  db.prepare(
    `INSERT INTO audit_log (session_id, actor, action, details_json, ts) VALUES (?, ?, ?, ?, ?)`
  ).run(sessionId, actor, action, details ? JSON.stringify(details) : null, new Date().toISOString());
}
