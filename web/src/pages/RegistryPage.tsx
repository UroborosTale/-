import { useEffect, useState } from "react";
import { api, type RegistryProcess, type ProcessLink } from "../api/client";
import type { SessionListItem } from "../types";

const LEVEL_LABEL: Record<string, string> = { L0: "L0 — группа процессов", L1: "L1 — процесс", L2: "L2 — подпроцесс", L3: "L3 — процедура" };
const CLASS_LABEL: Record<string, string> = { main: "Основной", support: "Обеспечивающий", management: "Управленческий" };
const STATUS_LABEL: Record<string, string> = { draft: "Черновик", review: "На согласовании", approved: "Утверждён", archived: "Архив" };

/** ФТ-М3.1 (реестр процессов) + ФТ-М3.2 (связи, стыки, разрывы). */
export default function RegistryPage() {
  const [rows, setRows] = useState<RegistryProcess[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [filters, setFilters] = useState<{ level?: string; classification?: string; department?: string; status?: string; q?: string }>({});
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<"registry" | "links">("registry");
  const [links, setLinks] = useState<ProcessLink[]>([]);
  const [suggestions, setSuggestions] = useState<{ from_process_id: string; to_process_id: string; data_label: string }[]>([]);
  const [gaps, setGaps] = useState<{ processId: string; name: string; unconsumedOutputs: string[]; unproducedInputs: string[] }[]>([]);

  async function reload() {
    setRows(await api.listRegistry(filters));
  }

  useEffect(() => {
    reload();
    api.listSessions().then(setSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function reloadLinks() {
    setLinks(await api.listProcessLinks());
    setSuggestions(await api.suggestProcessLinks());
    setGaps(await api.processLinkGaps());
  }

  useEffect(() => {
    if (tab === "links") reloadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const byId = new Map(rows.map((r) => [r.id, r] as const));

  return (
    <div className="card" style={{ margin: 16 }}>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Реестр процессов</h2>
        <div className="spacer" />
        <button onClick={() => setTab("registry")} className={tab === "registry" ? "active" : ""}>Реестр</button>
        <button onClick={() => setTab("links")} className={tab === "links" ? "active" : ""}>Связи и разрывы</button>
        {tab === "registry" && (
          <>
            <a href={api.registryExportXlsxUrl()} target="_blank" rel="noreferrer"><button>Экспорт .xlsx</button></a>
            <button className="primary" onClick={() => setShowNew(true)}>+ Добавить процесс</button>
          </>
        )}
      </div>

      {tab === "registry" && (
        <>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <input placeholder="Поиск по названию/коду" value={filters.q ?? ""} onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })} />
            <select value={filters.level ?? ""} onChange={(e) => setFilters({ ...filters, level: e.target.value || undefined })}>
              <option value="">Все уровни</option>
              {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.classification ?? ""} onChange={(e) => setFilters({ ...filters, classification: e.target.value || undefined })}>
              <option value="">Все классы</option>
              {Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}>
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {showNew && (
            <NewProcessForm
              sessions={sessions}
              onCancel={() => setShowNew(false)}
              onCreate={async (input) => { await api.createRegistryProcess(input); setShowNew(false); await reload(); }}
            />
          )}

          <table className="mono" style={{ width: "100%", fontSize: 13, marginTop: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Код</th><th>Название</th><th>Уровень</th><th>Класс</th><th>Владелец</th><th>Подразделение</th><th>Статус</th><th>Версия</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td>{r.code ?? "—"}</td>
                  <td>{r.name}</td>
                  <td>{r.level}</td>
                  <td>{CLASS_LABEL[r.classification]}</td>
                  <td>{r.owner ?? "—"}</td>
                  <td>{r.department ?? "—"}</td>
                  <td>
                    <select value={r.status} onChange={async (e) => { await api.patchRegistryProcess(r.id, { status: e.target.value as any }); reload(); }}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>v{r.version}</td>
                  <td>
                    <button onClick={async () => { if (confirm(`Удалить «${r.name}» из реестра?`)) { await api.deleteRegistryProcess(r.id); reload(); } }}>✕</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="muted" style={{ padding: 12 }}>Реестр пуст.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {tab === "links" && (
        <div style={{ marginTop: 12 }}>
          <h4>Подтверждённые связи</h4>
          {links.length === 0 && <p className="muted">Связей пока нет.</p>}
          <ul style={{ fontSize: 13 }}>
            {links.map((l) => (
              <li key={l.id}>
                {byId.get(l.from_process_id)?.name ?? l.from_process_id} → {byId.get(l.to_process_id)?.name ?? l.to_process_id} ({l.data_label})
                {!l.confirmed && (
                  <>
                    {" "}<span className="badge-hyp">не подтверждено</span>{" "}
                    <button onClick={async () => { await api.confirmProcessLink(l.id); reloadLinks(); }}>Подтвердить</button>
                  </>
                )}
                {" "}<button onClick={async () => { await api.deleteProcessLink(l.id); reloadLinks(); }}>✕</button>
              </li>
            ))}
          </ul>

          <h4 style={{ marginTop: 20 }}>Предлагаемые стыки (ФТ-М3.2.1)</h4>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            Автоматически найдено по совпадению выхода одного процесса и входа другого — требует подтверждения аналитика.
          </div>
          {suggestions.length === 0 && <p className="muted">Кандидатов не найдено.</p>}
          <ul style={{ fontSize: 13 }}>
            {suggestions.map((s, i) => (
              <li key={i}>
                {byId.get(s.from_process_id)?.name ?? s.from_process_id} → {byId.get(s.to_process_id)?.name ?? s.to_process_id} ({s.data_label}){" "}
                <button onClick={async () => { await api.createProcessLink({ ...s, confirmed: true }); reloadLinks(); }}>Принять</button>
              </li>
            ))}
          </ul>

          <h4 style={{ marginTop: 20 }}>Разрывы (ФТ-М3.2.3)</h4>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Вход без производителя или выход без потребителя.</div>
          {gaps.length === 0 && <p className="muted">Разрывов не найдено.</p>}
          {gaps.map((g) => (
            <div key={g.processId} className="validation-item warning" style={{ marginBottom: 6 }}>
              <strong>{g.name}</strong>
              {g.unconsumedOutputs.length > 0 && <div>Выходы без потребителя: {g.unconsumedOutputs.join(", ")}</div>}
              {g.unproducedInputs.length > 0 && <div>Входы без производителя: {g.unproducedInputs.join(", ")}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProcessForm({
  sessions,
  onCancel,
  onCreate,
}: {
  sessions: SessionListItem[];
  onCancel: () => void;
  onCreate: (input: Partial<RegistryProcess>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState<"L0" | "L1" | "L2" | "L3">("L2");
  const [classification, setClassification] = useState<"main" | "support" | "management">("main");
  const [owner, setOwner] = useState("");
  const [department, setDepartment] = useState("");
  const [sessionId, setSessionId] = useState("");

  return (
    <div className="card" style={{ marginTop: 10, background: "#f8fafc" }}>
      <div className="form-grid">
        <label className="field"><span>Название*</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Код</span><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="P-001" /></label>
        <label className="field"><span>Уровень</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as any)}>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field"><span>Классификация</span>
          <select value={classification} onChange={(e) => setClassification(e.target.value as any)}>
            {Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field"><span>Владелец</span><input value={owner} onChange={(e) => setOwner(e.target.value)} /></label>
        <label className="field"><span>Подразделение</span><input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
        <label className="field"><span>Связанная модель (сессия)</span>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">— не выбрано —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <div className="toolbar" style={{ marginTop: 10 }}>
        <button
          className="primary"
          disabled={!name.trim()}
          onClick={() => onCreate({ name, code: code || null, level, classification, owner: owner || null, department: department || null, session_id: sessionId || null })}
        >
          Создать
        </button>
        <button onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
}
