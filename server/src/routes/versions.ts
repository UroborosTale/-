import { Router } from "express";
import { getSession, addVersion, rollbackToVersion } from "../repo.js";
import type { ProcessLogicModel } from "../types/model.js";
import { logAudit } from "../db.js";

export const versionsRouter = Router();

/** М7.1: список версий модели (без полного слепка модели — только метаданные). */
versionsRouter.get("/sessions/:id/versions", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(
    session.versions.map((v) => ({
      seq: v.seq,
      version: v.version,
      major: v.major,
      ts: v.ts,
      note: v.note,
      author: v.author,
      nodeCount: v.model.nodes.length,
      flowCount: v.model.flows.length,
    }))
  );
});

/** Ручной снимок версии (минорная). Каждое значимое сохранение также создаёт снимок автоматически (см. routes/sessions.ts, routes/process.ts). */
versionsRouter.post("/sessions/:id/versions", (req, res) => {
  const note = (req.body?.note as string) || "снимок версии";
  const author = (req.body?.author as string) || "аналитик";
  try {
    const updated = addVersion(req.params.id, note, { author });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

/** ФТ-М7.1.1: утверждение — присваивает мажорную версию и статус "approved". */
versionsRouter.post("/sessions/:id/versions/approve", (req, res) => {
  const note = (req.body?.note as string) || "Утверждено";
  const author = (req.body?.author as string) || "владелец процесса";
  try {
    const updated = addVersion(req.params.id, note, { major: true, author });
    logAudit(req.params.id, author, "model_approved", { note });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

/** ФТ-М7.1.3: откат к версии — создаёт новый снимок, история не переписывается. */
versionsRouter.post("/sessions/:id/versions/:seq/rollback", (req, res) => {
  const seq = Number(req.params.seq);
  const author = (req.body?.author as string) || "аналитик";
  try {
    const updated = rollbackToVersion(req.params.id, seq, author);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

function diffModels(a: ProcessLogicModel, b: ProcessLogicModel) {
  function diffList<T extends { id: string }>(an: T[], bn: T[]) {
    const aById = new Map(an.map((x) => [x.id, x] as const));
    const bById = new Map(bn.map((x) => [x.id, x] as const));
    const added = bn.filter((x) => !aById.has(x.id));
    const removed = an.filter((x) => !bById.has(x.id));
    const changed: { id: string; before: T; after: T }[] = [];
    for (const [id, av] of aById) {
      const bv = bById.get(id);
      if (bv && JSON.stringify(av) !== JSON.stringify(bv)) changed.push({ id, before: av, after: bv });
    }
    return { added, removed, changed };
  }
  return {
    process: JSON.stringify(a.process) !== JSON.stringify(b.process) ? { before: a.process, after: b.process } : null,
    nodes: diffList(a.nodes, b.nodes),
    flows: diffList(a.flows, b.flows),
    roles: diffList(a.roles, b.roles),
    systems: diffList(a.systems, b.systems),
    data: diffList(a.data, b.data),
    controls: diffList(a.controls, b.controls),
    kpi: diffList(a.process.kpi ?? [], b.process.kpi ?? []),
    raci: diffList(
      a.raci.map((r, i) => ({ ...r, id: `${r.node_id}:${r.role_id}:${r.type}:${i}` })),
      b.raci.map((r, i) => ({ ...r, id: `${r.node_id}:${r.role_id}:${r.type}:${i}` }))
    ),
  };
}

/** ФТ-М7.1.2: сравнение двух версий — diff PLM. Визуальный diff диаграмм строится на клиенте по added/removed/changed id. */
versionsRouter.get("/sessions/:id/versions/:a/diff/:b", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const va = session.versions.find((v) => v.version === req.params.a || String(v.seq) === req.params.a);
  const vb = session.versions.find((v) => v.version === req.params.b || String(v.seq) === req.params.b);
  if (!va || !vb) {
    res.status(404).json({ error: "version not found" });
    return;
  }
  res.json({ from: { seq: va.seq, version: va.version }, to: { seq: vb.seq, version: vb.version }, diff: diffModels(va.model, vb.model) });
});
