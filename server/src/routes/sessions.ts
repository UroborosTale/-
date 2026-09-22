import { Router } from "express";
import { createSession, deleteSession, getSession, listSessions, updateSession, addVersion } from "../repo.js";
import type { SessionMeta } from "../repo.js";
import { ProcessLogicModel } from "../types/model.js";
import { validateModel } from "../pipeline/validate.js";
import { generateBpmn } from "../pipeline/bpmn.js";
import { generateIdef0 } from "../pipeline/idef0.js";
import { detectGaps } from "../pipeline/gaps.js";
import { logAudit } from "../db.js";
import { providerStatus } from "../llm/provider.js";

export const sessionsRouter = Router();

sessionsRouter.get("/provider-status", (_req, res) => {
  res.json(providerStatus());
});

sessionsRouter.get("/sessions", (_req, res) => {
  const list = listSessions().map((s) => ({
    id: s.id,
    title: s.title,
    mode: s.mode,
    status: s.status,
    meta: s.meta,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
    gapsOpen: s.model?.gaps?.filter((g) => g.status === "open").length ?? 0,
    hasErrors: s.validation.some((v) => v.severity === "error"),
    diagramsStale: s.diagramsStale,
  }));
  res.json(list);
});

sessionsRouter.post("/sessions", (req, res) => {
  const body = req.body as { title?: string; mode?: "A" | "B"; meta: SessionMeta };
  if (!body?.meta?.processName) {
    res.status(400).json({ error: "meta.processName is required" });
    return;
  }
  const meta: SessionMeta = {
    processName: body.meta.processName,
    department: body.meta.department,
    owner: body.meta.owner,
    modelType: body.meta.modelType ?? "AS-IS",
    decompositionDepth: body.meta.decompositionDepth ?? 2,
    notations: body.meta.notations ?? ["IDEF0", "BPMN"],
  };
  const session = createSession({ title: body.title || meta.processName, mode: body.mode ?? "A", meta });
  res.status(201).json(session);
});

sessionsRouter.get("/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(session);
});

sessionsRouter.delete("/sessions/:id", (req, res) => {
  deleteSession(req.params.id);
  res.status(204).end();
});

sessionsRouter.patch("/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const body = req.body as { title?: string; meta?: SessionMeta };
  const updated = updateSession(req.params.id, { title: body.title, meta: body.meta });
  logAudit(req.params.id, "analyst", "session_meta_updated", body);
  res.json(updated);
});

/**
 * Правка модели вручную (редактор, ФТ-9.1). Принимает частичную модель
 * (обычно с изменённым узлом/связью), помечает диаграммы как устаревшие
 * (ФТ-8.2), даёт возможность пересобрать их отдельным вызовом.
 */
sessionsRouter.put("/sessions/:id/model", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const parsed = ProcessLogicModel.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid model", details: parsed.error.flatten() });
    return;
  }
  const model = parsed.data;
  model.gaps = detectGaps(model);
  const validation = validateModel(model);
  const updated = updateSession(req.params.id, { model, validation, diagramsStale: true });
  logAudit(req.params.id, "analyst", "model_edited");
  res.json(updated);
});

/** Пересборка BPMN/IDEF0 из текущей модели после ручной правки (ФТ-8.2). */
sessionsRouter.post("/sessions/:id/rebuild-diagrams", (req, res) => {
  const session = getSession(req.params.id);
  if (!session || !session.model) {
    res.status(404).json({ error: "no model" });
    return;
  }
  const bpmn = generateBpmn(session.model);
  const idef0 = generateIdef0(session.model);
  const updated = updateSession(req.params.id, { bpmnXml: bpmn.xml, idef0, diagramsStale: false });
  res.json(updated);
});

sessionsRouter.post("/sessions/:id/versions", (req, res) => {
  const note = (req.body?.note as string) || "снимок версии";
  try {
    const updated = addVersion(req.params.id, note);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

sessionsRouter.get("/sessions/:id/versions/:v1/diff/:v2", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const v1 = session.versions.find((v) => String(v.version) === req.params.v1);
  const v2 = session.versions.find((v) => String(v.version) === req.params.v2);
  if (!v1 || !v2) {
    res.status(404).json({ error: "version not found" });
    return;
  }
  res.json(diffModels(v1.model, v2.model));
});

function diffModels(a: ProcessLogicModel, b: ProcessLogicModel) {
  function names(arr: { id: string; name: string }[]) {
    return new Map(arr.map((x) => [x.id, x.name] as const));
  }
  function diffList(an: { id: string; name?: string }[], bn: { id: string; name?: string }[]) {
    const aIds = new Set(an.map((x) => x.id));
    const bIds = new Set(bn.map((x) => x.id));
    return {
      added: bn.filter((x) => !aIds.has(x.id)),
      removed: an.filter((x) => !bIds.has(x.id)),
    };
  }
  return {
    nodes: diffList(a.nodes, b.nodes),
    flows: diffList(a.flows as any, b.flows as any),
    roles: diffList(a.roles, b.roles),
    data: diffList(a.data, b.data),
    controls: diffList(a.controls, b.controls),
  };
}

sessionsRouter.post("/sessions/:id/comments", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { element_id, text, author } = req.body as { element_id: string | null; text: string; author?: string };
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const comment = { id: `c_${Date.now()}_${Math.round(Math.random() * 1e6)}`, element_id, text, author: author || "аналитик", ts: new Date().toISOString() };
  const updated = updateSession(req.params.id, { comments: [...session.comments, comment] });
  res.status(201).json(updated);
});
