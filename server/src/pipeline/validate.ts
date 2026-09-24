import type { ProcessLogicModel, ValidationIssue } from "../types/model.js";

/**
 * Детерминированная валидация BPMN (5.1) и IDEF0 (5.2) + стиль наименований (5.3).
 * Ошибки (error) блокируют экспорт, предупреждения (warning) — нет (5.4).
 */
export function validateModel(model: ProcessLogicModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let counter = 0;
  const add = (
    notation: ValidationIssue["notation"],
    severity: ValidationIssue["severity"],
    rule: string,
    message: string,
    element_id: string | null
  ) => {
    counter += 1;
    issues.push({ id: `val${counter}`, notation, severity, rule, message, element_id });
  };

  const nodeById = new Map(model.nodes.map((n) => [n.id, n] as const));
  const outAdj = new Map<string, string[]>();
  const inCount = new Map<string, number>();
  for (const f of model.flows) {
    outAdj.set(f.from, [...(outAdj.get(f.from) ?? []), f.to]);
    inCount.set(f.to, (inCount.get(f.to) ?? 0) + 1);
  }

  // --- BPMN 5.1 ---
  const startNodes = model.nodes.filter((n) => n.type === "event" && n.subtype === "start");
  const endNodes = model.nodes.filter((n) => n.type === "event" && n.subtype === "end");
  if (startNodes.length === 0) {
    add("BPMN", "error", "bpmn_no_start", "В модели отсутствует стартовое событие.", null);
  }
  if (endNodes.length === 0) {
    add("BPMN", "error", "bpmn_no_end", "В модели отсутствует конечное событие.", null);
  }

  // недостижимые узлы: BFS от стартовых узлов (или от узлов без входящих связей, если старт не определён)
  const roots = startNodes.length > 0 ? startNodes.map((n) => n.id) : model.nodes.filter((n) => (inCount.get(n.id) ?? 0) === 0).map((n) => n.id);
  const reached = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (reached.has(cur)) continue;
    reached.add(cur);
    for (const next of outAdj.get(cur) ?? []) queue.push(next);
  }
  for (const n of model.nodes) {
    if (!reached.has(n.id)) {
      add("BPMN", "error", "bpmn_unreachable_node", `Узел «${n.name}» недостижим из стартового события.`, n.id);
    }
  }

  // тупики: узел без исходящих связей, не являющийся конечным событием
  for (const n of model.nodes) {
    const isEnd = n.type === "event" && n.subtype === "end";
    if (isEnd) continue;
    if ((outAdj.get(n.id) ?? []).length === 0) {
      add("BPMN", "error", "bpmn_dead_end", `Узел «${n.name}» не имеет продолжения (тупик потока).`, n.id);
    }
  }

  // парные шлюзы: шлюз с 1 входом и 1 выходом — вероятно, лишний / не сбалансирован
  for (const n of model.nodes) {
    if (n.type !== "gateway") continue;
    const outs = (outAdj.get(n.id) ?? []).length;
    const ins = inCount.get(n.id) ?? 0;
    if (outs <= 1 && ins <= 1) {
      add("BPMN", "warning", "bpmn_gateway_unbalanced", `Шлюз «${n.name}» не разветвляет и не объединяет поток — проверьте необходимость.`, n.id);
    }
  }

  // простая проверка на возможный livelock: цикл без выхода
  const visited = new Set<string>();
  const stack = new Set<string>();
  function dfs(id: string, path: string[]): void {
    if (stack.has(id)) {
      const cycle = path.slice(path.indexOf(id));
      const hasExit = cycle.some((cid) => (outAdj.get(cid) ?? []).some((t) => !cycle.includes(t)));
      if (!hasExit) {
        add(
          "BPMN",
          "warning",
          "bpmn_possible_livelock",
          `Обнаружен цикл без выхода: ${cycle.map((cid) => nodeById.get(cid)?.name ?? cid).join(" → ")}.`,
          id
        );
      }
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    for (const next of outAdj.get(id) ?? []) dfs(next, [...path, id]);
    stack.delete(id);
  }
  for (const n of model.nodes) dfs(n.id, []);

  // --- IDEF0 5.2 ---
  const topLevel = model.nodes.filter((n) => (n.type === "task" || n.type === "subprocess") && !n.idef0_parent);
  if (topLevel.length > 0 && (topLevel.length < 3 || topLevel.length > 6)) {
    add(
      "IDEF0",
      "warning",
      "idef0_block_count",
      `На уровне декомпозиции A0 ${topLevel.length} блок(ов) — рекомендуется 3–6 по правилам IDEF0.`,
      null
    );
  }
  for (const n of topLevel) {
    if (n.controls.length === 0) {
      add("IDEF0", "warning", "idef0_no_control", `У функции «${n.name}» нет управления (control).`, n.id);
    }
    if (n.outputs.length === 0) {
      add("IDEF0", "warning", "idef0_no_output", `У функции «${n.name}» нет выхода (output).`, n.id);
    }
  }

  // --- 5.3 Стиль наименований ---
  const infinitiveEnding = /(ть|ться|чь)\b/iu;
  for (const n of model.nodes) {
    if (n.type === "task" || n.type === "subprocess") {
      if (!infinitiveEnding.test(n.name)) {
        add(
          "MODEL",
          "warning",
          "naming_action_style",
          `Название действия «${n.name}» рекомендуется формулировать как «глагол в инфинитиве + объект» (например: «согласовать заявку»).`,
          n.id
        );
      }
    }
    if (n.type === "event") {
      if (infinitiveEnding.test(n.name)) {
        add(
          "MODEL",
          "warning",
          "naming_event_style",
          `Название события «${n.name}» рекомендуется формулировать как состояние объекта (например: «заявка одобрена»), а не как действие.`,
          n.id
        );
      }
    }
  }

  // --- ФТ-М1.3.2: матрица RACI — ровно один A и хотя бы один R на действие.
  // Проверяется только если RACI уже заполнена (фича опциональная, ФТ-М1.3).
  if (model.raci.length > 0) {
    for (const n of model.nodes) {
      if (n.type !== "task" && n.type !== "subprocess") continue;
      const forNode = model.raci.filter((r) => r.node_id === n.id);
      const aCount = forNode.filter((r) => r.type === "A").length;
      const rCount = forNode.filter((r) => r.type === "R").length;
      if (aCount === 0) {
        add("MODEL", "error", "raci_missing_a", `Действие «${n.name}» не имеет ответственного (A) в матрице RACI.`, n.id);
      } else if (aCount > 1) {
        add("MODEL", "error", "raci_multiple_a", `Действие «${n.name}» имеет более одного ответственного (A) в матрице RACI — должен быть ровно один.`, n.id);
      }
      if (rCount === 0) {
        add("MODEL", "warning", "raci_missing_r", `Действие «${n.name}» не имеет исполнителя (R) в матрице RACI.`, n.id);
      }
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
