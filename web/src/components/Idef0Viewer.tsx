import { useState } from "react";
import type { Idef0Result } from "../types";

type Diagram = "decomposition" | "context" | "tree";

const LABELS: Record<Diagram, string> = {
  decomposition: "Декомпозиция A0",
  context: "Контекст A-0",
  tree: "Узловое дерево",
};

export default function Idef0Viewer({ idef0 }: { idef0: Idef0Result | null }) {
  const [diagram, setDiagram] = useState<Diagram>("decomposition");
  if (!idef0) return <p className="muted">Диаграмма IDEF0 ещё не сгенерирована.</p>;

  const svg = { decomposition: idef0.decompositionSvg, context: idef0.contextSvg, tree: idef0.nodeTreeSvg }[diagram];

  return (
    <div>
      <div className="diagram-tabs">
        {(Object.keys(LABELS) as Diagram[]).map((d) => (
          <button key={d} className={d === diagram ? "primary" : ""} onClick={() => setDiagram(d)}>
            {LABELS[d]}
          </button>
        ))}
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "#fff", overflow: "auto", padding: 8 }}
           dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
