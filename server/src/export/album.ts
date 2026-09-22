import type { SessionRecord } from "../repo.js";
import type { ProcessLogicModel } from "../types/model.js";
import { layoutLayered, type LayoutNodeIn, type LayoutEdgeIn } from "../pipeline/layout.js";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderBpmnSchematic(model: ProcessLogicModel): string {
  const nodeById = new Map(model.nodes.map((n) => [n.id, n] as const));
  const roleIndex = new Map(model.roles.map((r, i) => [r.id, i] as const));
  const layoutNodes: LayoutNodeIn[] = model.nodes.map((n) => ({
    id: n.id,
    width: n.type === "gateway" ? 40 : 120,
    height: n.type === "gateway" ? 40 : 60,
    laneIndex: n.role_id ? roleIndex.get(n.role_id) ?? model.roles.length : model.roles.length,
  }));
  const layoutEdges: LayoutEdgeIn[] = model.flows.map((f) => ({ id: f.id, from: f.from, to: f.to }));
  const laneCount = model.roles.length + 1;
  const layout = layoutLayered(layoutNodes, layoutEdges, laneCount);

  const boxes = model.nodes
    .map((n) => {
      const b = layout.boxes.get(n.id);
      if (!b) return "";
      const fill = n.type === "gateway" ? "#fef3c7" : n.type === "event" ? "#dcfce7" : "#eef2ff";
      const rx = n.type === "event" ? Math.min(b.width, b.height) / 2 : n.type === "gateway" ? 4 : 6;
      return `<g>
        <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${rx}" fill="${fill}" stroke="#1f2937" stroke-width="1.2" />
        <text x="${b.x + b.width / 2}" y="${b.y + b.height / 2 + 4}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif">${esc(
        n.name.length > 22 ? n.name.slice(0, 20) + "…" : n.name
      )}</text>
      </g>`;
    })
    .join("\n");

  const edges = model.flows
    .map((f) => {
      const from = layout.boxes.get(f.from);
      const to = layout.boxes.get(f.to);
      if (!from || !to) return "";
      const x1 = from.x + from.width;
      const y1 = from.y + from.height / 2;
      const x2 = to.x;
      const y2 = to.y + to.height / 2;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b7280" stroke-width="1.2" marker-end="url(#arrow2)" />`;
    })
    .join("\n");

  const laneLabels = [...model.roles.map((r) => r.name), "Без исполнителя"]
    .map((name, i) => {
      const y = 60 + i * 150 + 20;
      return `<text x="8" y="${y}" font-size="10" font-family="Arial, sans-serif" fill="#4b5563">${esc(name)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.totalWidth} ${layout.totalHeight}" width="100%">
    <defs><marker id="arrow2" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#6b7280" /></marker></defs>
    <rect x="0" y="0" width="${layout.totalWidth}" height="${layout.totalHeight}" fill="#ffffff" />
    ${laneLabels}
    ${edges}
    ${boxes}
  </svg>`;
}

/** PDF/HTML-альбом (ФТ-10.2): диаграммы, глоссарий, список допущений. */
export function buildAlbumHtml(session: SessionRecord): string {
  const m = session.model!;
  const hypotheses = m.nodes.filter((n) => n.status === "hypothesis");
  const openGaps = m.gaps.filter((g) => g.status === "open");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${esc(session.meta.processName)} — альбом моделей</title>
<style>
  body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 32px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
  .meta { color: #4b5563; font-size: 13px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
  .diagram { border: 1px solid #e5e7eb; padding: 8px; margin-top: 8px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
  .badge-critical { background: #fee2e2; color: #991b1b; }
  .badge-important { background: #fef3c7; color: #92400e; }
  .badge-desirable { background: #e0e7ff; color: #3730a3; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <h1>${esc(session.meta.processName)}</h1>
  <div class="meta">
    Тип модели: ${esc(m.process.type)} · Владелец: ${esc(m.process.owner ?? "—")} · Подразделение: ${esc(m.process.department ?? "—")}<br/>
    Цель: ${esc(m.process.goal ?? "не выявлена")} · Триггер: ${esc(m.process.trigger ?? "не выявлен")} · Результат: ${esc(m.process.result ?? "не выявлен")}
  </div>

  <h2>Контекстная диаграмма IDEF0 (A-0)</h2>
  <div class="diagram">${session.idef0?.contextSvg ?? ""}</div>

  <h2>Декомпозиция IDEF0 (A0)</h2>
  <div class="diagram">${session.idef0?.decompositionSvg ?? ""}</div>

  <div class="page-break"></div>
  <h2>Схема процесса (BPMN, упрощённая схема для печати — полная диаграмма в .bpmn файле)</h2>
  <div class="diagram">${renderBpmnSchematic(m)}</div>

  <h2>Глоссарий ролей</h2>
  <table><thead><tr><th>Роль</th><th>Тип</th></tr></thead><tbody>
    ${m.roles.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.kind === "internal" ? "внутренняя" : "внешняя"}</td></tr>`).join("")}
  </tbody></table>

  <h2>Глоссарий документов и данных</h2>
  <table><thead><tr><th>Название</th><th>Тип</th></tr></thead><tbody>
    ${m.data.map((d) => `<tr><td>${esc(d.name)}</td><td>${d.kind === "document" ? "документ" : "данные"}</td></tr>`).join("")}
  </tbody></table>

  <h2>Информационные системы</h2>
  <table><thead><tr><th>Система</th></tr></thead><tbody>
    ${m.systems.map((s) => `<tr><td>${esc(s.name)}</td></tr>`).join("")}
  </tbody></table>

  <h2>Регламентирующие факторы</h2>
  <table><thead><tr><th>Регламент/правило</th><th>Тип</th></tr></thead><tbody>
    ${m.controls.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.kind)}</td></tr>`).join("")}
  </tbody></table>

  <div class="page-break"></div>
  <h2>Список допущений (элементы-гипотезы без подтверждающей цитаты уверенностью &lt; 0.6)</h2>
  <table><thead><tr><th>Элемент</th><th>Уверенность</th><th>Источник</th></tr></thead><tbody>
    ${hypotheses
      .map(
        (n) =>
          `<tr><td>${esc(n.name)}</td><td>${n.confidence.toFixed(2)}</td><td>${esc(
            n.source[0] ? `[${n.source[0].fragment_id}] «${n.source[0].quote}»` : "—"
          )}</td></tr>`
      )
      .join("")}
  </tbody></table>

  <h2>Открытые вопросы</h2>
  <table><thead><tr><th>Приоритет</th><th>Вопрос</th></tr></thead><tbody>
    ${openGaps
      .map((g) => `<tr><td><span class="badge badge-${g.priority}">${g.priority}</span></td><td>${esc(g.question)}</td></tr>`)
      .join("")}
  </tbody></table>
</body>
</html>`;
}
