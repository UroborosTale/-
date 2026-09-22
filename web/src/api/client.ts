import type { SessionListItem, SessionMeta, SessionRecord } from "../types";

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
  diffVersions: (id: string, v1: number, v2: number) => req<any>("GET", `/sessions/${id}/versions/${v1}/diff/${v2}`),
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
};
