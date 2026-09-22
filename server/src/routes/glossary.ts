import { Router } from "express";
import { db, logAudit } from "../db.js";

export const glossaryRouter = Router();

/** Словарь терминов и ролей организации (ФТ-11.2), пополняемый вручную или из подтверждённых моделей. */
glossaryRouter.get("/glossary", (_req, res) => {
  const rows = db.prepare(`SELECT key, kind, value FROM glossary ORDER BY key`).all();
  res.json(rows);
});

glossaryRouter.put("/glossary/:key", (req, res) => {
  const { kind, value } = req.body as { kind: string; value: string };
  if (!value) {
    res.status(400).json({ error: "value is required" });
    return;
  }
  db.prepare(`INSERT INTO glossary (key, kind, value) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET kind = excluded.kind, value = excluded.value`).run(
    req.params.key,
    kind || "term",
    value
  );
  logAudit(null, "admin", "glossary_upsert", { key: req.params.key });
  res.json({ key: req.params.key, kind: kind || "term", value });
});

glossaryRouter.delete("/glossary/:key", (req, res) => {
  db.prepare(`DELETE FROM glossary WHERE key = ?`).run(req.params.key);
  res.status(204).end();
});

/** Пополнение словаря из подтверждённых элементов модели (роли/системы) одной сессии. */
glossaryRouter.post("/glossary/import-from-session/:sessionId", (req, res) => {
  const row = db.prepare(`SELECT model_json FROM sessions WHERE id = ?`).get(req.params.sessionId) as { model_json: string | null } | undefined;
  if (!row?.model_json) {
    res.status(404).json({ error: "модель не найдена" });
    return;
  }
  const model = JSON.parse(row.model_json);
  const insert = db.prepare(
    `INSERT INTO glossary (key, kind, value) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING`
  );
  let count = 0;
  for (const r of model.roles ?? []) {
    insert.run(r.name.toLowerCase(), "role", r.name);
    count++;
  }
  for (const s of model.systems ?? []) {
    insert.run(s.name.toLowerCase(), "system", s.name);
    count++;
  }
  res.json({ imported: count });
});
