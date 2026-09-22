import { useState } from "react";
import { api } from "../api/client";
import type { SessionRecord } from "../types";

export default function ExportsPanel({ session, onSnapshot }: { session: SessionRecord; onSnapshot: () => void }) {
  const [note, setNote] = useState("");
  const [v1, setV1] = useState<number | "">("");
  const [v2, setV2] = useState<number | "">("");
  const [diff, setDiff] = useState<any>(null);
  const id = session.id;

  const links: { label: string; path: string; disabled?: boolean }[] = [
    { label: "BPMN 2.0 XML (.bpmn)", path: "bpmn" },
    { label: "IDEF0 A0, декомпозиция (.svg)", path: "idef0/decomposition.svg" },
    { label: "IDEF0 A-0, контекст (.svg)", path: "idef0/context.svg" },
    { label: "IDEF0 узловое дерево (.svg)", path: "idef0/tree.svg" },
    { label: "IDEF0 (draw.io .xml)", path: "idef0.drawio" },
    { label: "Промежуточная модель (.json)", path: "model.json" },
    { label: "Лист уточняющих вопросов (.txt)", path: "questions.txt" },
    { label: "Протокол интервью (.md)", path: "protocol.md" },
    { label: "Проблемы и предложения TO-BE (.md)", path: "statements.md" },
    { label: "Альбом моделей — HTML", path: "album.html" },
    { label: "Альбом моделей — PDF", path: "album.pdf" },
  ];

  return (
    <div>
      <h4>Экспорт</h4>
      <div className="exports-row">
        {links.map((l) => (
          <a key={l.path} href={api.exportUrl(id, l.path)} target="_blank" rel="noreferrer">
            <button disabled={!session.model}>{l.label}</button>
          </a>
        ))}
      </div>

      <h4 style={{ marginTop: 20 }}>Версии модели</h4>
      <div className="chat-input-row">
        <input placeholder="Примечание к снимку версии" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={!session.model} onClick={async () => { await onSnapshotClick(); }}>Сохранить версию</button>
      </div>
      {session.versions.length > 0 && (
        <>
          <ul style={{ fontSize: 12 }}>
            {session.versions.map((v) => (
              <li key={v.version}>
                v{v.version} — {new Date(v.ts).toLocaleString("ru-RU")} — {v.note}
              </li>
            ))}
          </ul>
          <div className="toolbar">
            <select value={v1} onChange={(e) => setV1(Number(e.target.value))}>
              <option value="">версия A</option>
              {session.versions.map((v) => <option key={v.version} value={v.version}>v{v.version}</option>)}
            </select>
            <select value={v2} onChange={(e) => setV2(Number(e.target.value))}>
              <option value="">версия B</option>
              {session.versions.map((v) => <option key={v.version} value={v.version}>v{v.version}</option>)}
            </select>
            <button
              disabled={v1 === "" || v2 === ""}
              onClick={async () => {
                const d = await api.diffVersions(id, Number(v1), Number(v2));
                setDiff(d);
              }}
            >
              Сравнить
            </button>
          </div>
          {diff && (
            <pre className="mono" style={{ background: "#f8fafc", padding: 10, borderRadius: 6 }}>
              {JSON.stringify(diff, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );

  async function onSnapshotClick() {
    await api.addVersion(id, note || "снимок версии");
    setNote("");
    onSnapshot();
  }
}
