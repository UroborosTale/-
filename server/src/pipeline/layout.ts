export interface LayoutNodeIn {
  id: string;
  width: number;
  height: number;
  laneIndex: number;
}
export interface LayoutEdgeIn {
  id: string;
  from: string;
  to: string;
}
export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  boxes: Map<string, LayoutBox>;
  laneBounds: { laneIndex: number; y: number; height: number }[];
  totalWidth: number;
  totalHeight: number;
}

const LAYER_SPACING = 190;
const LANE_HEIGHT = 150;
const START_X = 100;
const START_Y = 60;

/**
 * Простой детерминированный слева-направо layered layout со swimlane-рядами
 * по ролям. Не зависит от внешних сервисов, поэтому раскладка воспроизводима
 * (НФТ-3) и не требует сети.
 */
export function layoutLayered(nodes: LayoutNodeIn[], edges: LayoutEdgeIn[], laneCount: number): LayoutResult {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
  }

  // DFS для отделения back-edges (циклов) и получения топологического порядка
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const backEdges = new Set<string>();
  const postorder: string[] = [];

  function dfs(u: string) {
    visited.add(u);
    inStack.add(u);
    for (const v of adj.get(u) ?? []) {
      const key = `${u}->${v}`;
      if (inStack.has(v)) {
        backEdges.add(key);
        continue;
      }
      if (!visited.has(v)) dfs(v);
    }
    inStack.delete(u);
    postorder.push(u);
  }
  for (const n of nodes) if (!visited.has(n.id)) dfs(n.id);
  const topoOrder = [...postorder].reverse();

  const layer = new Map<string, number>();
  for (const id of topoOrder) layer.set(id, layer.get(id) ?? 0);
  for (const u of topoOrder) {
    for (const v of adj.get(u) ?? []) {
      if (backEdges.has(`${u}->${v}`)) continue;
      layer.set(v, Math.max(layer.get(v) ?? 0, (layer.get(u) ?? 0) + 1));
    }
  }

  const boxes = new Map<string, LayoutBox>();
  const occupied = new Map<string, number>(); // key `${layer}:${lane}` -> count

  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  for (const id of topoOrder) {
    const n = nodeById.get(id);
    if (!n) continue;
    const l = layer.get(id) ?? 0;
    const key = `${l}:${n.laneIndex}`;
    const stagger = occupied.get(key) ?? 0;
    occupied.set(key, stagger + 1);

    const x = START_X + l * LAYER_SPACING + stagger * 36;
    const laneY = START_Y + n.laneIndex * LANE_HEIGHT;
    const y = laneY + (LANE_HEIGHT - n.height) / 2 + stagger * 26;
    boxes.set(id, { x, y, width: n.width, height: n.height });
  }

  const maxLayer = Math.max(0, ...[...layer.values()]);
  const totalWidth = START_X + (maxLayer + 1) * LAYER_SPACING + 80;
  const totalHeight = START_Y + laneCount * LANE_HEIGHT + 40;

  const laneBounds = Array.from({ length: laneCount }, (_, i) => ({
    laneIndex: i,
    y: START_Y + i * LANE_HEIGHT,
    height: LANE_HEIGHT,
  }));

  return { boxes, laneBounds, totalWidth, totalHeight };
}
