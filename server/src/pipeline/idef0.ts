import type { ProcessLogicModel, ProcessNode } from "../types/model.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function textBlock(x: number, y: number, text: string, maxChars: number, fontSize = 12): string {
  const lines = wrapLines(text, maxChars);
  const startY = y - ((lines.length - 1) * (fontSize + 2)) / 2;
  return lines
    .map((l, i) => `<text x="${x}" y="${startY + i * (fontSize + 2)}" font-size="${fontSize}" text-anchor="middle" font-family="Arial, sans-serif">${esc(l)}</text>`)
    .join("");
}

const DEFS = `<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#1f2937" />
  </marker>
</defs>`;

function arrowPath(points: [number, number][], label?: string): string {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const mid = points[Math.floor(points.length / 2)];
  const labelXml = label
    ? `<text x="${mid[0] + 4}" y="${mid[1] - 6}" font-size="10.5" font-family="Arial, sans-serif" fill="#374151">${esc(label)}</text>`
    : "";
  return `<path d="${d}" fill="none" stroke="#1f2937" stroke-width="1.4" marker-end="url(#arrow)" />${labelXml}`;
}

export interface Idef0Block {
  nodeId: string;
  code: string; // A1, A2, ...
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Idef0Result {
  contextSvg: string; // A-0
  decompositionSvg: string; // A0
  nodeTreeSvg: string;
  blocks: Idef0Block[];
  width: number;
  height: number;
}

const BLOCK_W = 170;
const BLOCK_H = 90;
const STEP_X = 230;
const STEP_Y = 150;
const MARGIN = 110;

/**
 * Детерминированная генерация IDEF0-диаграмм (ФТ-7): контекстная A-0,
 * декомпозиция A0 с диагональным расположением блоков и ICOM-стрелками,
 * узловое дерево.
 */
export function generateIdef0(model: ProcessLogicModel): Idef0Result {
  const dataById = new Map(model.data.map((d) => [d.id, d] as const));
  const controlById = new Map(model.controls.map((c) => [c.id, c] as const));
  const roleById = new Map(model.roles.map((r) => [r.id, r] as const));
  const systemById = new Map(model.systems.map((s) => [s.id, s] as const));

  const topLevel = model.nodes.filter((n) => (n.type === "task" || n.type === "subprocess") && !n.idef0_parent);
  const blocksSource = (topLevel.length > 0 ? topLevel : model.nodes.filter((n) => n.type === "task")).slice(0, 8);

  const producedBy = new Map<string, string>(); // dataId -> nodeId (first producer within set)
  for (const n of blocksSource) for (const outId of n.outputs) if (!producedBy.has(outId)) producedBy.set(outId, n.id);

  const blocks: Idef0Block[] = blocksSource.map((n, i) => ({
    nodeId: n.id,
    code: `A${i + 1}`,
    name: n.name,
    x: MARGIN + i * STEP_X,
    y: MARGIN + i * STEP_Y,
    w: BLOCK_W,
    h: BLOCK_H,
  }));
  const blockByNode = new Map(blocks.map((b) => [b.nodeId, b] as const));

  const width = MARGIN * 2 + (blocks.length - 1) * STEP_X + BLOCK_W + 260;
  const height = MARGIN * 2 + (blocks.length - 1) * STEP_Y + BLOCK_H + 220;

  const svgParts: string[] = [];
  svgParts.push(DEFS);

  const externalInputs: string[] = [];
  const externalControls: string[] = [];
  const externalOutputs: string[] = [];
  const mechanisms = new Set<string>();

  for (const n of blocksSource) {
    const b = blockByNode.get(n.id)!;
    svgParts.push(
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#eef2ff" stroke="#1f2937" stroke-width="1.6" />`
    );
    svgParts.push(textBlock(b.x + b.w / 2, b.y + b.h / 2 - 6, n.name, 22));
    svgParts.push(
      `<text x="${b.x + 6}" y="${b.y + b.h - 6}" font-size="10" font-family="Arial, sans-serif" fill="#4b5563">${b.code}</text>`
    );

    // controls (top) — все считаем внешними на уровне A0 (регламенты обычно приходят извне)
    n.controls.forEach((cid, ci) => {
      const c = controlById.get(cid);
      if (!c) return;
      const x = b.x + 20 + ci * 26;
      svgParts.push(arrowPath([[x, b.y - 46], [x, b.y]], c.name));
      externalControls.push(c.name);
    });

    // inputs (left)
    n.inputs.forEach((did, di) => {
      const d = dataById.get(did);
      if (!d) return;
      const producer = producedBy.get(did);
      const y = b.y + 18 + di * 18;
      if (producer && producer !== n.id && blockByNode.has(producer)) {
        const pb = blockByNode.get(producer)!;
        svgParts.push(
          arrowPath(
            [
              [pb.x + pb.w, pb.y + pb.h / 2],
              [pb.x + pb.w + 24, pb.y + pb.h / 2],
              [pb.x + pb.w + 24, y],
              [b.x, y],
            ],
            d.name
          )
        );
      } else {
        svgParts.push(arrowPath([[b.x - 60, y], [b.x, y]], d.name));
        externalInputs.push(d.name);
      }
    });

    // outputs (right) — если не потреблены внутри набора, уходят за границу
    n.outputs.forEach((did, oi) => {
      const d = dataById.get(did);
      if (!d) return;
      const consumedInternally = blocksSource.some((other) => other.id !== n.id && other.inputs.includes(did));
      const y = b.y + 18 + oi * 18;
      if (!consumedInternally) {
        svgParts.push(arrowPath([[b.x + b.w, y], [b.x + b.w + 60, y]], d.name));
        externalOutputs.push(d.name);
      }
    });

    // mechanisms (bottom): исполнитель + системы
    const mechNames: string[] = [];
    if (n.role_id) {
      const r = roleById.get(n.role_id);
      if (r) mechNames.push(r.name);
    }
    for (const sid of n.system_ids) {
      const s = systemById.get(sid);
      if (s) mechNames.push(s.name);
    }
    mechNames.forEach((m, mi) => mechanisms.add(m));
    mechNames.forEach((m, mi) => {
      const x = b.x + 20 + mi * 40;
      svgParts.push(arrowPath([[x, b.y + b.h + 40], [x, b.y + b.h]], m));
    });
  }

  const decompositionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    <text x="16" y="24" font-size="14" font-weight="bold" font-family="Arial, sans-serif">A0 — ${esc(model.process.name)}</text>
    ${svgParts.join("\n    ")}
  </svg>`;

  // --- Контекстная диаграмма A-0 ---
  const ctxW = 640;
  const ctxH = 420;
  const cb = { x: ctxW / 2 - 110, y: ctxH / 2 - 55, w: 220, h: 110 };
  const uniq = (arr: string[]) => [...new Set(arr)];
  const inputs = uniq(externalInputs);
  const controls = uniq([...externalControls, ...model.controls.map((c) => c.name)]);
  const outputs = uniq(externalOutputs.length ? externalOutputs : model.process.result ? [model.process.result] : []);
  const mechs = uniq([...mechanisms, ...model.roles.map((r) => r.name)]);

  const ctxParts: string[] = [DEFS];
  ctxParts.push(`<rect x="${cb.x}" y="${cb.y}" width="${cb.w}" height="${cb.h}" fill="#eef2ff" stroke="#1f2937" stroke-width="1.8" />`);
  ctxParts.push(textBlock(cb.x + cb.w / 2, cb.y + cb.h / 2 - 8, model.process.name, 26, 13));
  ctxParts.push(`<text x="${cb.x + 8}" y="${cb.y + cb.h - 8}" font-size="10" fill="#4b5563">A-0</text>`);

  inputs.slice(0, 5).forEach((name, i) => {
    const y = cb.y + 20 + i * 18;
    ctxParts.push(arrowPath([[cb.x - 90, y], [cb.x, y]], name));
  });
  controls.slice(0, 5).forEach((name, i) => {
    const x = cb.x + 24 + i * 34;
    ctxParts.push(arrowPath([[x, cb.y - 60], [x, cb.y]], name));
  });
  outputs.slice(0, 5).forEach((name, i) => {
    const y = cb.y + 20 + i * 18;
    ctxParts.push(arrowPath([[cb.x + cb.w, y], [cb.x + cb.w + 90, y]], name));
  });
  mechs.slice(0, 5).forEach((name, i) => {
    const x = cb.x + 24 + i * 34;
    ctxParts.push(arrowPath([[x, cb.y + cb.h + 60], [x, cb.y + cb.h]], name));
  });

  const goalLine = model.process.goal ? `Цель: ${model.process.goal}` : "";
  const viewLine = `Точка зрения: ${model.process.owner ?? model.process.department ?? "владелец процесса"}`;

  const contextSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ctxW} ${ctxH + 50}" width="${ctxW}" height="${ctxH + 50}">
    <rect x="0" y="0" width="${ctxW}" height="${ctxH + 50}" fill="#ffffff" />
    <text x="16" y="24" font-size="14" font-weight="bold" font-family="Arial, sans-serif">A-0 — контекстная диаграмма</text>
    ${ctxParts.join("\n    ")}
    <text x="16" y="${ctxH + 20}" font-size="11" font-family="Arial, sans-serif" fill="#374151">${esc(goalLine)}</text>
    <text x="16" y="${ctxH + 38}" font-size="11" font-family="Arial, sans-serif" fill="#374151">${esc(viewLine)}</text>
  </svg>`;

  // --- Узловое дерево (ФТ-7.4) ---
  const treeW = 700;
  const treeRowH = 46;
  const treeH = 60 + (blocks.length + 1) * treeRowH;
  const treeParts: string[] = [];
  treeParts.push(`<rect x="120" y="20" width="140" height="34" fill="#eef2ff" stroke="#1f2937" />`);
  treeParts.push(`<text x="190" y="42" text-anchor="middle" font-size="11" font-family="Arial, sans-serif">A0 — ${esc(model.process.name)}</text>`);
  blocks.forEach((b, i) => {
    const y = 90 + i * treeRowH;
    treeParts.push(`<line x1="190" y1="54" x2="${360}" y2="${y + 17}" stroke="#9ca3af" />`);
    treeParts.push(`<rect x="360" y="${y}" width="220" height="34" fill="#ffffff" stroke="#1f2937" />`);
    treeParts.push(
      `<text x="470" y="${y + 21}" text-anchor="middle" font-size="11" font-family="Arial, sans-serif">${b.code} — ${esc(
        b.name.length > 28 ? b.name.slice(0, 26) + "…" : b.name
      )}</text>`
    );
  });
  const nodeTreeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${treeW} ${treeH}" width="${treeW}" height="${treeH}">
    <rect x="0" y="0" width="${treeW}" height="${treeH}" fill="#ffffff" />
    ${treeParts.join("\n    ")}
  </svg>`;

  return { contextSvg, decompositionSvg, nodeTreeSvg, blocks, width, height };
}

/** Экспорт диаграммы декомпозиции в упрощённый draw.io (mxGraph) XML. */
export function idef0ToDrawio(model: ProcessLogicModel, result: Idef0Result): string {
  const cells: string[] = [];
  for (const b of result.blocks) {
    // ФТ-М9.4.2: id ячейки несёт id узла PLM ("IDEF0_<nodeId>") — это делает возможным
    // round-trip импорт правок из draw.io обратно в модель (routes/diagramImport.ts).
    cells.push(
      `<mxCell id="IDEF0_${b.nodeId}" value="${b.code}: ${escXml(b.name)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#eef2ff;strokeColor=#1f2937;" vertex="1" parent="1"><mxGeometry x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" as="geometry" /></mxCell>`
    );
  }
  return `<mxfile host="app">
  <diagram name="IDEF0 A0" id="idef0-a0">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${result.width}" pageHeight="${result.height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
