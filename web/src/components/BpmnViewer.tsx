import { useEffect, useRef } from "react";
// @ts-ignore - bpmn-js не поставляет типы для NavigatedViewer в подпути
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

export default function BpmnViewer({ xml, onSelect }: { xml: string | null; onSelect?: (modelNodeId: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || !xml) return;
    // Полная очистка контейнера перед созданием нового экземпляра —
    // защита от остаточных SVG-узлов bpmn-js при повторном монтировании
    // (например, из-за React StrictMode в dev-режиме).
    containerRef.current.innerHTML = "";

    const viewer = new NavigatedViewer({ container: containerRef.current });
    let destroyed = false;

    const eventBus: any = viewer.get("eventBus");
    const handler = (e: any) => {
      const id: string | undefined = e.element?.id;
      if (!onSelectRef.current) return;
      if (id && id.startsWith("Node_")) {
        onSelectRef.current(id.slice("Node_".length));
      } else {
        onSelectRef.current(null);
      }
    };
    eventBus.on("element.click", handler);

    viewer
      .importXML(xml)
      .then(() => {
        if (!destroyed) (viewer.get("canvas") as any).zoom("fit-viewport");
      })
      .catch((err: Error) => console.error("Ошибка отрисовки BPMN:", err));

    return () => {
      destroyed = true;
      viewer.destroy();
    };
  }, [xml]);

  if (!xml) return <p className="muted">Диаграмма BPMN ещё не сгенерирована.</p>;
  return <div ref={containerRef} className="bpmn-canvas" />;
}
