import { useEffect, useState } from "react";
import { api, type RegistryProcess, type ProcessLink, type ProcessCard } from "../api/client";
import type { SessionListItem } from "../types";

const LEVEL_LABEL: Record<string, string> = { L0: "L0 — группа процессов", L1: "L1 — процесс", L2: "L2 — подпроцесс", L3: "L3 — процедура" };
const CLASS_LABEL: Record<string, string> = { main: "Основной", support: "Обеспечивающий", management: "Управленческий" };
const STATUS_LABEL: Record<string, string> = { draft: "Черновик", review: "На согласовании", needs_rework: "На доработке", approved: "Утверждён", archived: "Архив" };

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
  const [cardId, setCardId] = useState<string | null>(null);

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
                    <button onClick={() => setCardId(r.id)}>Карточка</button>{" "}
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

      {cardId && <CardModal processId={cardId} onClose={() => setCardId(null)} />}
    </div>
  );
}

function CardModal({ processId, onClose }: { processId: string; onClose: () => void }) {
  const [card, setCard] = useState<ProcessCard | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [mappingText, setMappingText] = useState("{}");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getProcessCard(processId).then(setCard);
    api.getCardSyncConfig(processId).then((cfg) => {
      setWebhookUrl(cfg.webhook_url ?? "");
      setMappingText(JSON.stringify(cfg.field_mapping ?? {}, null, 2));
      setLastSynced(cfg.last_synced_at);
    });
  }, [processId]);

  const LINK_LABEL: Record<string, string> = {
    bpmn: "BPMN 2.0 (.bpmn)",
    idef0_decomposition: "IDEF0 декомпозиция (.svg)",
    model_json: "Модель (.json)",
    regulation_docx: "Регламент (.docx)",
    raci_xlsx: "Матрица RACI (.xlsx)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div className="card" style={{ width: 560, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        {!card ? (
          <p className="muted">Загрузка…</p>
        ) : (
          <>
            <div className="toolbar">
              <h3 style={{ margin: 0 }}>{card.name}</h3>
              <div className="spacer" />
              <button onClick={onClose}>✕</button>
            </div>
            <table className="mono" style={{ fontSize: 13, marginTop: 8 }}>
              <tbody>
                <tr><td className="muted" style={{ paddingRight: 12 }}>Код</td><td>{card.code ?? "—"}</td></tr>
                <tr><td className="muted">Уровень</td><td>{card.level}</td></tr>
                <tr><td className="muted">Классификация</td><td>{card.classification}</td></tr>
                <tr><td className="muted">Владелец</td><td>{card.owner ?? "—"}</td></tr>
                <tr><td className="muted">Подразделение</td><td>{card.department ?? "—"}</td></tr>
                <tr><td className="muted">Статус</td><td>{card.status}</td></tr>
                <tr><td className="muted">Версия</td><td>v{card.version}</td></tr>
                <tr><td className="muted">Дата пересмотра</td><td>{card.review_date ?? "—"}</td></tr>
              </tbody>
            </table>

            <h4 style={{ marginTop: 16 }}>KPI</h4>
            {card.kpi.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Показатели не заданы в связанной модели.</p>
            ) : (
              <ul style={{ fontSize: 13 }}>
                {card.kpi.map((k) => <li key={k.id}>{k.name}{k.target ? ` — ${k.target}${k.unit ? ` ${k.unit}` : ""}` : ""}</li>)}
              </ul>
            )}

            <h4 style={{ marginTop: 16 }}>Ссылки на модели и документы</h4>
            {Object.keys(card.links).length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Процесс не связан с сессией моделирования.</p>
            ) : (
              <ul style={{ fontSize: 13 }}>
                {Object.entries(card.links).map(([k, url]) => (
                  <li key={k}><a href={url} target="_blank" rel="noreferrer">{LINK_LABEL[k] ?? k}</a></li>
                ))}
              </ul>
            )}

            <h4 style={{ marginTop: 16 }}>Синхронизация с внешним реестром (ФТ-М1.5.2)</h4>
            <p className="muted" style={{ fontSize: 12 }}>
              Универсальный вебхук-коннектор: карточка отправляется POST-запросом на указанный URL.
              Маппинг переименовывает поля карточки перед отправкой (JSON: {"{"}"исходное_поле": "новое_имя"{"}"}).
            </p>
            <label className="field"><span>Webhook URL</span><input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." /></label>
            <label className="field" style={{ marginTop: 6 }}>
              <span>Маппинг полей (JSON)</span>
              <textarea style={{ width: "100%", height: 80, fontFamily: "monospace", fontSize: 12 }} value={mappingText} onChange={(e) => setMappingText(e.target.value)} />
            </label>
            {lastSynced && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Последняя синхронизация: {new Date(lastSynced).toLocaleString("ru-RU")}</div>}
            {syncResult && <div className="validation-item" style={{ marginTop: 6 }}>{syncResult}</div>}
            <div className="toolbar" style={{ marginTop: 8 }}>
              <button
                disabled={busy || !webhookUrl.trim()}
                onClick={async () => {
                  setBusy(true);
                  setSyncResult(null);
                  try {
                    let mapping: Record<string, string> = {};
                    try { mapping = JSON.parse(mappingText || "{}"); } catch { setSyncResult("Ошибка: маппинг должен быть корректным JSON"); return; }
                    await api.setCardSyncConfig(processId, webhookUrl.trim(), mapping);
                    const r = await api.syncCard(processId);
                    setSyncResult(r.ok ? "Синхронизировано успешно." : `Внешняя система ответила статусом ${r.status}.`);
                    const cfg = await api.getCardSyncConfig(processId);
                    setLastSynced(cfg.last_synced_at);
                  } catch (e) {
                    setSyncResult("Ошибка: " + (e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Сохранить и синхронизировать
              </button>
            </div>
          </>
        )}
      </div>
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
