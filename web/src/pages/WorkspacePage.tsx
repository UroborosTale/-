import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { SessionRecord } from "../types";
import TextPanel from "../components/TextPanel";
import BpmnViewer from "../components/BpmnViewer";
import Idef0Viewer from "../components/Idef0Viewer";
import GapsPanel from "../components/GapsPanel";
import ValidationPanel from "../components/ValidationPanel";
import ModelPanel from "../components/ModelPanel";
import ChatPanel from "../components/ChatPanel";
import CommentsPanel from "../components/CommentsPanel";
import ExportsPanel from "../components/ExportsPanel";
import IngestPanel from "../components/IngestPanel";
import VersionsPanel from "../components/VersionsPanel";
import RaciPanel from "../components/RaciPanel";
import RegulationPanel from "../components/RegulationPanel";
import MultiInterviewPanel from "../components/MultiInterviewPanel";
import VerificationPanel from "../components/VerificationPanel";
import ReviewPanel from "../components/ReviewPanel";

type Tab = "text" | "bpmn" | "idef0" | "model" | "gaps" | "validation" | "export" | "versions" | "raci" | "regulation" | "multiInterview" | "verification" | "review" | "chat";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WorkspacePage({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const s = await api.getSession(sessionId);
    setSession(s);
  }, [sessionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (session?.mode === "B") setTab("chat");
  }, [session?.id]);

  if (!session) return <p className="muted">Загрузка сессии…</p>;

  const model = session.model;
  const selectedNode = model?.nodes.find((n) => n.id === selectedId) ?? null;
  const highlightFragmentId = selectedNode?.source?.[0]?.fragment_id ?? null;

  function selectElement(id: string | null) {
    setSelectedId(id);
  }

  async function withBusy<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    ...(session.mode === "B" ? [{ key: "chat" as Tab, label: "Интервью" }] : []),
    { key: "text", label: "Текст" },
    { key: "bpmn", label: "BPMN" },
    { key: "idef0", label: "IDEF0" },
    { key: "model", label: "Модель" },
    { key: "gaps", label: `Пробелы${model ? ` (${model.gaps.filter((g) => g.status === "open").length})` : ""}` },
    { key: "validation", label: `Валидация${session.validation.length ? ` (${session.validation.length})` : ""}` },
    { key: "raci", label: "RACI" },
    { key: "regulation", label: "Регламент" },
    { key: "multiInterview", label: "Мультиинтервью" },
    { key: "verification", label: "Верификация" },
    { key: "review", label: "Согласование" },
    { key: "versions", label: "Версии" },
    { key: "export", label: "Экспорт" },
  ];

  return (
    <div>
      <div className="toolbar">
        <button onClick={onBack}>← Назад</button>
        <h2 style={{ margin: 0 }}>{session.title}</h2>
        <span className={`pill status-${session.status}`}>{session.status}</span>
        {session.diagramsStale && (
          <button onClick={() => withBusy(async () => setSession(await api.rebuildDiagrams(sessionId)))}>
            Пересобрать диаграммы (модель изменена)
          </button>
        )}
        <div className="spacer" />
        {session.provider && <span className="muted" style={{ fontSize: 12 }}>LLM: {session.provider}</span>}
      </div>

      {error && <div className="validation-item error">{error}</div>}

      {session.mode === "A" && session.status !== "ready" && tab !== "chat" && (
        <IngestPanel
          hasFragments={session.fragments.length > 0}
          busy={busy}
          onIngestText={(text, append, anonymize) =>
            withBusy(async () => setSession(await api.ingestText(sessionId, text, { append, anonymize })))
          }
          onUploadFile={(file, append, anonymize) =>
            withBusy(async () => {
              const b64 = await fileToBase64(file);
              setSession(await api.uploadFile(sessionId, file.name, b64, { append, anonymize }));
            })
          }
          onRun={() => withBusy(async () => setSession(await api.runPipeline(sessionId)))}
        />
      )}

      {session.mode === "A" && session.status === "ready" && (
        <div className="toolbar">
          <button onClick={() => withBusy(async () => setSession(await api.runPipeline(sessionId)))}>Перезапустить обработку текста</button>
        </div>
      )}

      <div className="ws-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" && session.mode === "B" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "calc(100vh - 260px)" }}>
          <div className="card" style={{ overflow: "hidden" }}>
            {session.chat.length === 0 ? (
              <div>
                <p>Начните интервью с владельцем процесса — система будет задавать уточняющие вопросы по ходу разговора.</p>
                <button className="primary" onClick={() => withBusy(async () => setSession(await api.interviewStart(sessionId)))}>
                  Начать интервью
                </button>
              </div>
            ) : (
              <ChatPanel
                chat={session.chat}
                busy={busy}
                finished={session.status === "completed"}
                onSend={(text) => withBusy(async () => setSession(await api.interviewTurn(sessionId, text)))}
                onFinish={() => withBusy(async () => setSession(await api.interviewFinish(sessionId)))}
              />
            )}
          </div>
          <div className="card" style={{ overflow: "auto" }}>
            <h4 style={{ marginTop: 0 }}>Живое превью BPMN</h4>
            <BpmnViewer xml={session.bpmnXml} onSelect={selectElement} />
            {selectedId && (
              <button
                style={{ marginTop: 8 }}
                onClick={() => withBusy(async () => setSession(await api.interviewFlag(sessionId, selectedId, prompt("Что не так с этим элементом?") || undefined)))}
              >
                Отметить выбранный элемент как неверный
              </button>
            )}
          </div>
        </div>
      )}

      {tab !== "chat" && (
        <div className="split">
          <div className="left">
            {tab === "text" && <TextPanel fragments={session.fragments} highlightId={highlightFragmentId} />}
            {tab === "bpmn" && <BpmnViewer xml={session.bpmnXml} onSelect={selectElement} />}
            {tab === "idef0" && <Idef0Viewer idef0={session.idef0} />}
            {tab === "model" && model && (
              <ModelPanel
                model={model}
                selectedId={selectedId}
                onSelectElement={selectElement}
                onUpdateNode={(nodeId, patch) =>
                  withBusy(async () => {
                    const updatedModel = {
                      ...model,
                      nodes: model.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
                    };
                    setSession(await api.putModel(sessionId, updatedModel));
                  })
                }
              />
            )}
            {tab === "model" && !model && <p className="muted">Модель ещё не построена.</p>}
            {tab === "gaps" && model && (
              <GapsPanel
                gaps={model.gaps}
                busy={busy}
                onSelectElement={(id) => {
                  selectElement(id);
                  setTab("text");
                }}
                onAnswer={(gapId, text) => withBusy(async () => setSession(await api.answerGap(sessionId, gapId, text))).then(() => {})}
              />
            )}
            {tab === "gaps" && !model && <p className="muted">Модель ещё не построена.</p>}
            {tab === "validation" && <ValidationPanel issues={session.validation} onSelectElement={(id) => { selectElement(id); setTab("model"); }} />}
            {tab === "raci" && model && <RaciPanel session={session} onChanged={reload} />}
            {tab === "raci" && !model && <p className="muted">Модель ещё не построена.</p>}
            {tab === "regulation" && model && <RegulationPanel session={session} />}
            {tab === "regulation" && !model && <p className="muted">Модель ещё не построена.</p>}
            {tab === "multiInterview" && <MultiInterviewPanel session={session} onChanged={reload} />}
            {tab === "verification" && model && <VerificationPanel session={session} onChanged={reload} />}
            {tab === "verification" && !model && <p className="muted">Модель ещё не построена.</p>}
            {tab === "review" && <ReviewPanel session={session} onChanged={reload} />}
            {tab === "versions" && <VersionsPanel session={session} onChanged={reload} />}
            {tab === "export" && <ExportsPanel session={session} />}
          </div>
          <div className="right card">
            <h4 style={{ marginTop: 0 }}>
              {selectedNode ? selectedNode.name : "Инспектор"}
            </h4>
            {selectedNode && (
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                <div className="muted">Уверенность: {selectedNode.confidence.toFixed(2)} {selectedNode.status === "hypothesis" && <span className="badge-hyp">гипотеза</span>}</div>
                {selectedNode.source[0] && (
                  <div style={{ marginTop: 6 }}>
                    <div className="muted">Источник [{selectedNode.source[0].fragment_id}]:</div>
                    <div style={{ fontStyle: "italic" }}>«{selectedNode.source[0].quote}»</div>
                    <button style={{ marginTop: 6 }} onClick={() => setTab("text")}>Показать в тексте</button>
                  </div>
                )}
              </div>
            )}
            <CommentsPanel
              comments={session.comments}
              selectedId={selectedId}
              onAdd={(elementId, text) => withBusy(async () => setSession(await api.addComment(sessionId, elementId, text))).then(() => {})}
            />
          </div>
        </div>
      )}
    </div>
  );
}
