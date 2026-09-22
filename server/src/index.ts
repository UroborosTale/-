import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sessionsRouter } from "./routes/sessions.js";
import { processRouter } from "./routes/process.js";
import { interviewRouter } from "./routes/interview.js";
import { exportRouter } from "./routes/export.js";
import { glossaryRouter } from "./routes/glossary.js";
import { templatesRouter } from "./routes/templates.js";
import "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/schema/process-logic.json", (_req, res) => {
  const schemaPath = path.join(__dirname, "schema", "process-logic.schema.json");
  res.type("application/json").send(fs.readFileSync(schemaPath, "utf-8"));
});

app.use("/api", sessionsRouter);
app.use("/api", processRouter);
app.use("/api", interviewRouter);
app.use("/api", exportRouter);
app.use("/api", glossaryRouter);
app.use("/api", templatesRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err?.message ?? "internal error" });
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`API сервер запущен: http://localhost:${PORT}`);
});
