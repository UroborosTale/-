import type { ProcessLogicModel, RaciEntry } from "../types/model.js";

/**
 * Автопостроение матрицы RACI (ФТ-М1.3.1): исполнитель действия (role_id
 * узла) получает R. Роли A/C/I предлагаются по маркерам в тексте цитат
 * источника узла — «утверждает» → A, «согласовывает» → C,
 * «уведомляется»/«информируется» → I. Если ни один маркер A не сработал,
 * по умолчанию исполнитель (R) считается и ответственным (A) за свой шаг.
 */
const APPROVE_STEMS = ["утвержда", "утверд", "подписыва", "подпис", "принима решение", "одобря", "одобр"];
const CONSULT_STEMS = ["согласовыва", "согласов", "консультир", "визиру", "советуется"];
const INFORM_STEMS = ["уведомля", "уведом", "информир", "сообща", "оповещ"];

function findRoleIdInText(text: string, roles: ProcessLogicModel["roles"], exclude?: string | null): string | null {
  const lower = text.toLowerCase();
  for (const r of roles) {
    if (r.id === exclude) continue;
    if (lower.includes(r.name.toLowerCase())) return r.id;
  }
  return null;
}

export function buildRaci(model: ProcessLogicModel): RaciEntry[] {
  const entries: RaciEntry[] = [];
  const seen = new Set<string>();
  const add = (node_id: string, role_id: string, type: RaciEntry["type"]) => {
    const key = `${node_id}:${role_id}:${type}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ node_id, role_id, type });
  };

  for (const n of model.nodes) {
    if (n.type !== "task" && n.type !== "subprocess") continue;
    if (n.role_id) add(n.id, n.role_id, "R");

    const text = n.source.map((s) => s.quote).join(" ").toLowerCase();
    let foundA = false;
    if (APPROVE_STEMS.some((s) => text.includes(s))) {
      const roleId = findRoleIdInText(text, model.roles) ?? n.role_id;
      if (roleId) {
        add(n.id, roleId, "A");
        foundA = true;
      }
    }
    if (CONSULT_STEMS.some((s) => text.includes(s))) {
      const roleId = findRoleIdInText(text, model.roles, n.role_id);
      if (roleId) add(n.id, roleId, "C");
    }
    if (INFORM_STEMS.some((s) => text.includes(s))) {
      const roleId = findRoleIdInText(text, model.roles, n.role_id);
      if (roleId) add(n.id, roleId, "I");
    }
    if (!foundA && n.role_id) add(n.id, n.role_id, "A");
  }
  return entries;
}
