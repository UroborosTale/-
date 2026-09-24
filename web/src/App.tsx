import { useEffect, useState } from "react";
import { api } from "./api/client";
import SessionsListPage from "./pages/SessionsListPage";
import NewSessionPage from "./pages/NewSessionPage";
import WorkspacePage from "./pages/WorkspacePage";
import RegistryPage from "./pages/RegistryPage";
import GlossaryPage from "./pages/GlossaryPage";
import RespondentInterviewPage from "./pages/RespondentInterviewPage";

type View = { name: "list" } | { name: "new" } | { name: "workspace"; id: string } | { name: "registry" } | { name: "glossary" };

/** ФТ-М4.2.2: персональная ссылка /campaign/:campaignId/:token — отдельная публичная страница без основной навигации. */
function matchCampaignRoute(): { campaignId: string; token: string } | null {
  const m = window.location.pathname.match(/^\/campaign\/([^/]+)\/([^/]+)\/?$/);
  return m ? { campaignId: m[1], token: m[2] } : null;
}

export default function App() {
  const campaignRoute = matchCampaignRoute();
  const [view, setView] = useState<View>({ name: "list" });
  const [provider, setProvider] = useState<{ name: string; live: boolean } | null>(null);

  useEffect(() => {
    api.providerStatus().then(setProvider).catch(() => setProvider(null));
  }, []);

  if (campaignRoute) {
    return <RespondentInterviewPage campaignId={campaignRoute.campaignId} token={campaignRoute.token} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand" onClick={() => setView({ name: "list" })}>
          IDEF0 / BPMN — модели по интервью
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {provider && (
            <span className={`provider-badge ${provider.live ? "live" : ""}`} title="LLM-провайдер для извлечения структуры">
              {provider.live ? `LLM: ${provider.name}` : "офлайн-режим (без внешней LLM)"}
            </span>
          )}
          {view.name !== "registry" && <button onClick={() => setView({ name: "registry" })}>Реестр процессов</button>}
          {view.name !== "glossary" && <button onClick={() => setView({ name: "glossary" })}>Справочники</button>}
          {view.name !== "list" && <button onClick={() => setView({ name: "list" })}>Все сессии</button>}
          {view.name !== "new" && <button className="primary" onClick={() => setView({ name: "new" })}>+ Новая сессия</button>}
        </div>
      </div>
      <div className="main-area">
        {view.name === "list" && (
          <SessionsListPage onOpen={(id) => setView({ name: "workspace", id })} onCreateNew={() => setView({ name: "new" })} />
        )}
        {view.name === "new" && <NewSessionPage onCreated={(id) => setView({ name: "workspace", id })} />}
        {view.name === "workspace" && <WorkspacePage sessionId={view.id} onBack={() => setView({ name: "list" })} />}
        {view.name === "registry" && <RegistryPage />}
        {view.name === "glossary" && <GlossaryPage />}
      </div>
    </div>
  );
}
