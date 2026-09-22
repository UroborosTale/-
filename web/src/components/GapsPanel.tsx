import { useState } from "react";
import type { Gap } from "../types";

const PRIORITY_LABEL: Record<string, string> = { critical: "Критично", important: "Важно", desirable: "Желательно" };
const ORDER: Record<string, number> = { critical: 0, important: 1, desirable: 2 };

export default function GapsPanel({
  gaps,
  onAnswer,
  onSelectElement,
  busy,
}: {
  gaps: Gap[];
  onAnswer: (gapId: string, text: string) => Promise<void>;
  onSelectElement: (id: string | null) => void;
  busy: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const open = gaps.filter((g) => g.status === "open").sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  const other = gaps.filter((g) => g.status !== "open");

  if (gaps.length === 0) return <p className="muted">Пробелов не выявлено.</p>;

  return (
    <div>
      {open.length === 0 && <p className="muted">Открытых пробелов нет — по правилам полноты модель выглядит целостной.</p>}
      {open.map((g) => (
        <div key={g.id} className="gap-item">
          <div className={`prio prio-${g.priority}`}>{PRIORITY_LABEL[g.priority]}</div>
          <div>
            {g.question}
            {g.element_id && (
              <>
                {" "}
                <a onClick={() => onSelectElement(g.element_id)} style={{ cursor: "pointer" }}>
                  [показать элемент]
                </a>
              </>
            )}
          </div>
          <div className="answer-row">
            <input
              placeholder="Ответ владельца процесса…"
              value={drafts[g.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && drafts[g.id]?.trim()) {
                  onAnswer(g.id, drafts[g.id].trim());
                  setDrafts((d) => ({ ...d, [g.id]: "" }));
                }
              }}
            />
            <button
              disabled={busy || !drafts[g.id]?.trim()}
              onClick={() => {
                onAnswer(g.id, drafts[g.id].trim());
                setDrafts((d) => ({ ...d, [g.id]: "" }));
              }}
            >
              Ответить
            </button>
          </div>
        </div>
      ))}
      {other.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowAll((v) => !v)}>{showAll ? "Скрыть закрытые пробелы" : `Показать закрытые (${other.length})`}</button>
          {showAll &&
            other.map((g) => (
              <div key={g.id} className="gap-item" style={{ opacity: 0.6 }}>
                <div className={`prio prio-${g.priority}`}>{PRIORITY_LABEL[g.priority]}</div>
                <div>{g.question}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
