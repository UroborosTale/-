import type { SessionListItem, SessionMeta, SessionRecord, VersionListItem, InterviewTrack, SessionRespondent, ChatMessage, Discrepancy, SourceRef, Gap, RequirementLink } from "../types";

export interface CampaignRespondentStatus {
  id: string;
  campaign_id: string;
  respondent_id: string;
  track_id: string;
  token: string;
  name: string;
  role_id: string | null;
  status: "pending" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  last_reminded_at: string | null;
  overdue: boolean;
}
export interface Campaign {
  id: string;
  session_id: string;
  name: string;
  due_date: string | null;
  reminder_webhook_url: string | null;
  created_at: string;
}
export interface CampaignStatus {
  campaign: Campaign;
  respondents: CampaignRespondentStatus[];
  coverage: { total: number; completed: number; inProgress: number; notStarted: number };
}
export interface VerificationParagraph {
  id: string;
  text: string;
  sourceRefs: string[];
}

export interface ReviewStep {
  id: string;
  role: string;
  label: string;
  assignee?: string | null;
  status: "pending" | "approved" | "rejected" | "skipped";
  comment?: string | null;
  ts?: string | null;
}
export interface ImpactReport {
  significance: "cosmetic" | "structural" | "affects_others";
  changedElementIds: string[];
  changedNodeNames: string[];
  adjacentProcesses: { processId: string; name: string; owner: string | null; reason: string }[];
  affectedDocuments: { paragraphId: string; section: string }[];
  affectedRequirements: { requirementId: string; elementId: string }[];
  affectedRoles: { roleId: string; name: string }[];
  kpiChanged: boolean;
  baselineSeq?: number;
  currentSeq?: number | null;
}
export interface ReviewRoute {
  id: string;
  steps: ReviewStep[];
  currentStepIndex: number;
  status: "review" | "needs_rework" | "approved";
  baselineSeq: number;
  impactReport: ImpactReport | null;
  startedAt: string;
  completedAt?: string | null;
}
export interface NotificationRow {
  id: string;
  session_id: string;
  recipient_kind: string;
  recipient_label: string;
  recipient_contact: string | null;
  channel: string;
  message: string;
  diff_link: string | null;
  is_read: number;
  created_at: string;
}

export interface RegistryProcess {
  id: string;
  code: string | null;
  name: string;
  level: "L0" | "L1" | "L2" | "L3";
  parent_process_id: string | null;
  classification: "main" | "support" | "management";
  owner: string | null;
  department: string | null;
  status: "draft" | "review" | "needs_rework" | "approved" | "archived";
  version: string;
  review_date: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessLink {
  id: string;
  from_process_id: string;
  to_process_id: string;
  data_label: string;
  confirmed: number | boolean;
  created_at: string;
}

export interface GlossaryEntry {
  key: string;
  kind: string;
  value: string;
  status: "proposed" | "confirmed";
}

export interface PositionRow {
  key: string;
  title: string;
  department: string | null;
}

export interface RegulationStaleness {
  generatedAtSeq: number | null;
  currentSeq: number | null;
  staleCount: number;
  staleParagraphIds: string[];
}

export interface ProcessCard {
  id: string;
  code: string | null;
  name: string;
  level: string;
  classification: string;
  owner: string | null;
  department: string | null;
  status: string;
  version: string;
  review_date: string | null;
  session_id: string | null;
  kpi: { id: string; name: string; target?: string | null; unit?: string | null }[];
  links: Record<string, string>;
}

// --- М2.1 Аналитика узких мест ---
export interface PathInfo {
  nodeIds: string[];
  nodeNames: string[];
  totalMinutes: number | null;
}
export interface NodeHeat {
  nodeId: string;
  name: string;
  heat: number;
  minutes: number | null;
  inLoop: boolean;
}
export interface BottleneckReport {
  hasTimingData: boolean;
  mainPath: PathInfo | null;
  worstPath: PathInfo | null;
  waitingShare: number | null;
  handoffCount: number;
  approvalCount: number;
  returnLoopCount: number;
  nodeHeat: NodeHeat[];
}

// --- М2.3 Антипаттерны ---
export interface AntipatternFinding {
  id: string;
  rule: string;
  label: string;
  elementIds: string[];
  explanation: string;
  quotes: SourceRef[];
}

// --- М2.2 Трудозатраты и стоимость ---
export interface RoleRate {
  role_key: string;
  role_name: string;
  rate: number;
  unit: string;
}
export interface RoleCost {
  roleId: string;
  roleName: string;
  minutesPerInstance: number;
  costPerInstance: number | null;
  hasRate: boolean;
}
export interface CostReport {
  roles: RoleCost[];
  totalMinutesPerInstance: number;
  totalCostPerInstance: number | null;
  frequencyPerMonth: number | null;
  totalCostPerMonth: number | null;
  missingRates: string[];
}
export interface SensitivityPoint {
  label: string;
  frequencyPerMonth: number | null;
  durationFactor: number;
  totalCostPerMonth: number | null;
}

// --- М6.1 Реестр требований ---
export interface RequirementRow {
  id: string;
  code: string;
  title: string;
  source: string;
  created_at: string;
}

// --- М6.2 Чек-лист процессного подхода ---
export interface ChecklistRuleRow {
  id: string;
  code: string;
  label: string;
  enabled: number;
}
export interface ChecklistRuleResult {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
}
export interface ChecklistResult {
  compliancePercent: number;
  results: ChecklistRuleResult[];
}

// --- М3.3 Карта процессов ---
export interface RegistryMapNode {
  id: string;
  code: string | null;
  name: string;
  level: string;
  parentProcessId: string | null;
  classification: string;
  status: string;
}
export interface RegistryMapEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface RegistryMap {
  nodes: RegistryMapNode[];
  edges: RegistryMapEdge[];
}

// --- М3.4 Поиск дублей ---
export interface DuplicateCandidate {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  score: number;
  reason: string;
}

// --- М6.5 Проверка актуальности ---
export interface StalenessRow {
  processId: string;
  name: string;
  status: string;
  reviewDate: string | null;
  reviewOverdue: boolean;
  daysOverdue: number;
  updatedAt: string;
}

// --- М6.3 Трассировка требований ---
export interface TraceabilityRequirementRow {
  requirementId: string;
  code: string;
  title: string;
  linkedElementIds: string[];
  coverage: "full" | "partial" | "none";
}
export interface TraceabilityReport {
  requirements: TraceabilityRequirementRow[];
  coveragePercent: number;
  uncoveredRequirementIds: string[];
  unlinkedElementIds: string[];
}

// --- М6.4 Аудит-трейл ---
export interface AuditLogRow {
  id: number;
  sessionId: string | null;
  actor: string;
  action: string;
  details: unknown;
  ts: string;
}

const BASE = "/api";

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = await res.json();
      message = j.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  providerStatus: () => req<{ name: string; live: boolean }>("GET", "/provider-status"),
  templates: () => req<{ id: string; name: string; hints: string[] }[]>("GET", "/templates"),

  listSessions: () => req<SessionListItem[]>("GET", "/sessions"),
  getSession: (id: string) => req<SessionRecord>("GET", `/sessions/${id}`),
  createSession: (input: { title?: string; mode: "A" | "B"; meta: SessionMeta }) =>
    req<SessionRecord>("POST", "/sessions", input),
  patchSession: (id: string, patch: { title?: string; meta?: SessionMeta }) =>
    req<SessionRecord>("PATCH", `/sessions/${id}`, patch),
  deleteSession: (id: string) => req<void>("DELETE", `/sessions/${id}`),
  putModel: (id: string, model: SessionRecord["model"]) => req<SessionRecord>("PUT", `/sessions/${id}/model`, model),
  rebuildDiagrams: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/rebuild-diagrams`),
  addVersion: (id: string, note: string) => req<SessionRecord>("POST", `/sessions/${id}/versions`, { note }),
  listVersions: (id: string) => req<VersionListItem[]>("GET", `/sessions/${id}/versions`),
  approveVersion: (id: string, note: string, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/versions/approve`, { note, author }),
  rollbackVersion: (id: string, seq: number, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/versions/${seq}/rollback`, { author }),
  diffVersions: (id: string, a: number | string, b: number | string) => req<any>("GET", `/sessions/${id}/versions/${a}/diff/${b}`),
  addComment: (id: string, element_id: string | null, text: string, author?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/comments`, { element_id, text, author }),

  ingestText: (id: string, text: string, opts?: { append?: boolean; anonymize?: boolean; sourceLabel?: string }) =>
    req<SessionRecord>("POST", `/sessions/${id}/ingest-text`, { text, ...opts }),
  uploadFile: (id: string, filename: string, contentBase64: string, opts?: { append?: boolean; anonymize?: boolean }) =>
    req<SessionRecord>("POST", `/sessions/${id}/upload`, { filename, contentBase64, ...opts }),
  runPipeline: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/run`),
  answerGap: (id: string, gapId: string, answerText: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/answers`, { gapId, answerText }),

  interviewStart: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/start`),
  interviewTurn: (id: string, text: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/turn`, { text }),
  interviewFlag: (id: string, element_id: string, note?: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/interview/flag-element`, { element_id, note }),
  interviewFinish: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/interview/finish`),

  exportUrl: (id: string, path: string) => `${BASE}/sessions/${id}/export/${path}`,

  // --- М3.1 Реестр процессов ---
  listRegistry: (filters?: { level?: string; classification?: string; department?: string; status?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    return req<RegistryProcess[]>("GET", `/registry${qs ? `?${qs}` : ""}`);
  },
  createRegistryProcess: (input: Partial<RegistryProcess>) => req<RegistryProcess>("POST", "/registry", input),
  patchRegistryProcess: (id: string, patch: Partial<RegistryProcess>) => req<RegistryProcess>("PATCH", `/registry/${id}`, patch),
  deleteRegistryProcess: (id: string) => req<void>("DELETE", `/registry/${id}`),
  registryExportXlsxUrl: () => `${BASE}/registry/export/xlsx`,
  listProcessLinks: () => req<ProcessLink[]>("GET", "/registry/links"),
  createProcessLink: (input: { from_process_id: string; to_process_id: string; data_label: string; confirmed?: boolean }) =>
    req<ProcessLink>("POST", "/registry/links", input),
  confirmProcessLink: (id: string) => req<void>("PATCH", `/registry/links/${id}/confirm`),
  deleteProcessLink: (id: string) => req<void>("DELETE", `/registry/links/${id}`),
  suggestProcessLinks: () => req<{ from_process_id: string; to_process_id: string; data_label: string }[]>("GET", "/registry/links/suggest"),
  processLinkGaps: () =>
    req<{ processId: string; name: string; unconsumedOutputs: string[]; unproducedInputs: string[] }[]>("GET", "/registry/links/gaps"),

  // --- М3.5 Справочники ---
  listGlossary: (filters?: { kind?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    return req<GlossaryEntry[]>("GET", `/glossary${qs ? `?${qs}` : ""}`);
  },
  upsertGlossary: (key: string, kind: string, value: string, status?: string) =>
    req<GlossaryEntry>("PUT", `/glossary/${encodeURIComponent(key)}`, { kind, value, status }),
  deleteGlossary: (key: string) => req<void>("DELETE", `/glossary/${encodeURIComponent(key)}`),
  listGlossaryProposals: () => req<GlossaryEntry[]>("GET", "/glossary/proposals"),
  confirmGlossaryProposal: (key: string) => req<void>("POST", `/glossary/proposals/${encodeURIComponent(key)}/confirm`),
  rejectGlossaryProposal: (key: string) => req<void>("POST", `/glossary/proposals/${encodeURIComponent(key)}/reject`),
  importGlossaryFromSession: (sessionId: string) => req<{ proposed: number }>("POST", `/glossary/import-from-session/${sessionId}`),

  listPositions: () => req<PositionRow[]>("GET", "/positions"),
  upsertPosition: (key: string, title: string, department?: string) => req<PositionRow>("PUT", `/positions/${encodeURIComponent(key)}`, { title, department }),
  deletePosition: (key: string) => req<void>("DELETE", `/positions/${encodeURIComponent(key)}`),
  listRolePositionMap: () => req<{ role_key: string; position_key: string }[]>("GET", "/role-position-map"),
  addRolePositionMap: (role_key: string, position_key: string) => req<void>("POST", "/role-position-map", { role_key, position_key }),
  removeRolePositionMap: (role_key: string, position_key: string) => req<void>("DELETE", "/role-position-map", { role_key, position_key }),
  importOrgStructureCsv: (csv: string) => req<{ positions: number; departments: number; mappings: number }>("POST", "/glossary/import-orgstructure", { csv }),

  // --- М1.3 RACI ---
  buildRaci: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/raci/build`),
  addRaciEntry: (id: string, node_id: string, role_id: string, type: "R" | "A" | "C" | "I") =>
    req<SessionRecord>("POST", `/sessions/${id}/raci/entries`, { node_id, role_id, type }),
  removeRaciEntry: (id: string, node_id: string, role_id: string, type: "R" | "A" | "C" | "I") =>
    req<SessionRecord>("DELETE", `/sessions/${id}/raci/entries`, { node_id, role_id, type }),
  raciExportXlsxUrl: (id: string) => `${BASE}/sessions/${id}/raci/export/xlsx`,

  // --- М1.1 Регламент ---
  regulationPreviewUrl: (id: string, structureOnly?: boolean) => `${BASE}/sessions/${id}/regulation/preview${structureOnly ? "?structureOnly=1" : ""}`,
  regulationExportHtmlUrl: (id: string, structureOnly?: boolean) => `${BASE}/sessions/${id}/regulation/export.html${structureOnly ? "?structureOnly=1" : ""}`,
  regulationExportDocxUrl: (id: string, structureOnly?: boolean) => `${BASE}/sessions/${id}/regulation/export.docx${structureOnly ? "?structureOnly=1" : ""}`,
  regulationStaleness: (id: string) => req<RegulationStaleness>("GET", `/sessions/${id}/regulation/staleness`),
  markRegulationGenerated: (id: string) => req<{ regulationSnapshotSeq: number | null }>("POST", `/sessions/${id}/regulation/mark-generated`),

  // --- М1.5 Карточка процесса ---
  getProcessCard: (id: string) => req<ProcessCard>("GET", `/registry/${id}/card`),
  getCardSyncConfig: (id: string) => req<{ webhook_url: string | null; field_mapping: Record<string, string>; last_synced_at: string | null }>("GET", `/registry/${id}/card/sync-config`),
  setCardSyncConfig: (id: string, webhook_url: string, field_mapping?: Record<string, string>) =>
    req<{ webhook_url: string; field_mapping: Record<string, string> }>("PUT", `/registry/${id}/card/sync-config`, { webhook_url, field_mapping }),
  syncCard: (id: string) => req<{ ok: boolean; status: number }>("POST", `/registry/${id}/card/sync`),

  // --- М4.1 Мультиинтервью ---
  listRespondents: (id: string) => req<(SessionRespondent & { track: InterviewTrack | null })[]>("GET", `/sessions/${id}/respondents`),
  addRespondent: (id: string, name: string, mode: "text" | "chat", roleId?: string | null, weight?: number) =>
    req<{ respondent: SessionRespondent; track: InterviewTrack }>("POST", `/sessions/${id}/respondents`, { name, mode, roleId, weight }),
  removeRespondent: (id: string, respondentId: string) => req<SessionRecord>("DELETE", `/sessions/${id}/respondents/${respondentId}`),
  trackIngestText: (id: string, trackId: string, text: string) => req<SessionRecord>("POST", `/sessions/${id}/tracks/${trackId}/ingest-text`, { text }),
  trackInterviewStart: (id: string, trackId: string) => req<InterviewTrack>("POST", `/sessions/${id}/tracks/${trackId}/interview/start`),
  trackInterviewTurn: (id: string, trackId: string, text: string) => req<InterviewTrack>("POST", `/sessions/${id}/tracks/${trackId}/interview/turn`, { text }),
  trackFinish: (id: string, trackId: string) => req<InterviewTrack>("POST", `/sessions/${id}/tracks/${trackId}/finish`),
  mergeTracks: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/tracks/merge`),
  listDiscrepancies: (id: string) => req<Discrepancy[]>("GET", `/sessions/${id}/discrepancies`),
  resolveDiscrepancy: (id: string, discId: string, resolved_value: string) =>
    req<SessionRecord>("POST", `/sessions/${id}/discrepancies/${discId}/resolve`, { resolved_value }),

  // --- М4.2 Асинхронный сбор (кампании) ---
  listCampaigns: (id: string) => req<Campaign[]>("GET", `/sessions/${id}/campaigns`),
  createCampaign: (id: string, name: string, due_date: string | null, respondents: { name: string; roleId?: string | null; weight?: number }[]) =>
    req<{ campaign: Campaign; respondents: { name: string; roleId: string | null; token: string; link: string }[] }>("POST", `/sessions/${id}/campaigns`, {
      name,
      due_date,
      respondents,
    }),
  getCampaignStatus: (campaignId: string) => req<CampaignStatus>("GET", `/campaigns/${campaignId}`),
  deleteCampaign: (campaignId: string) => req<void>("DELETE", `/campaigns/${campaignId}`),
  setCampaignReminderWebhook: (campaignId: string, webhook_url: string) =>
    req<{ webhook_url: string }>("PUT", `/campaigns/${campaignId}/reminder-webhook`, { webhook_url }),
  sendCampaignReminders: (campaignId: string) =>
    req<{ overdue: { name: string; status: string }[]; sent: number; note?: string }>("POST", `/campaigns/${campaignId}/remind`),

  // --- М4.2 публичные маршруты по токену (без остальной сессии) ---
  respondentView: (campaignId: string, token: string) =>
    req<{ processName: string; respondentName: string; roleId: string | null; chat: ChatMessage[]; status: string }>(
      "GET",
      `/campaigns/${campaignId}/respond/${token}`
    ),
  respondentTurn: (campaignId: string, token: string, text: string) =>
    req<{ chat: ChatMessage[]; status: string }>("POST", `/campaigns/${campaignId}/respond/${token}/turn`, { text }),
  respondentFinish: (campaignId: string, token: string) => req<{ status: string }>("POST", `/campaigns/${campaignId}/respond/${token}/finish`),

  // --- М4.4 Верификация текстом ---
  verificationPreview: (id: string) => req<{ paragraphs: VerificationParagraph[]; confirmed: string[] }>("GET", `/sessions/${id}/verification/preview`),
  confirmParagraph: (id: string, paragraphId: string) => req<{ confirmed: string[] }>("POST", `/sessions/${id}/verification/paragraphs/${paragraphId}/confirm`),
  unconfirmParagraph: (id: string, paragraphId: string) =>
    req<{ confirmed: string[] }>("POST", `/sessions/${id}/verification/paragraphs/${paragraphId}/unconfirm`),
  proposeVerificationEdit: (id: string, text: string) => req<{ diff: any; proposedModel: unknown; proposedFragments: unknown; proposedRawText: string }>(
    "POST",
    `/sessions/${id}/verification/propose-edit`,
    { text }
  ),
  applyVerificationEdit: (id: string, proposal: { proposedModel: unknown; proposedFragments: unknown; proposedRawText: string }) =>
    req<SessionRecord>("POST", `/sessions/${id}/verification/apply-edit`, proposal),

  // --- М7.2 Маршрут согласования ---
  getReview: (id: string) => req<ReviewRoute | null>("GET", `/sessions/${id}/review`),
  startReview: (id: string, steps?: { role: string; label: string; assignee?: string | null }[]) =>
    req<{ session: SessionRecord; impactReport: ImpactReport | null }>("POST", `/sessions/${id}/review/start`, { steps }),
  approveReviewStep: (id: string, comment?: string) =>
    req<{ session: SessionRecord; finalized: boolean; impactReport?: ImpactReport; notificationsSent?: number }>("POST", `/sessions/${id}/review/steps/current/approve`, { comment }),
  rejectReviewStep: (id: string, comment: string) =>
    req<{ session: SessionRecord; finalized: boolean }>("POST", `/sessions/${id}/review/steps/current/reject`, { comment }),
  reopenSession: (id: string) => req<SessionRecord>("POST", `/sessions/${id}/reopen`),

  // --- М7.3 Анализ влияния ---
  getImpact: (id: string, since?: number) => req<ImpactReport>("GET", `/sessions/${id}/impact${since !== undefined ? `?since=${since}` : ""}`),

  // --- М7.4 Уведомления ---
  listNotifications: (filters?: { session_id?: string; unread?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.session_id) params.set("session_id", filters.session_id);
    if (filters?.unread) params.set("unread", "1");
    const qs = params.toString();
    return req<NotificationRow[]>("GET", `/notifications${qs ? `?${qs}` : ""}`);
  },
  markNotificationRead: (id: string) => req<void>("POST", `/notifications/${id}/read`),
  getNotificationWebhook: (id: string) => req<{ webhook_url: string | null }>("GET", `/sessions/${id}/notification-webhook`),
  setNotificationWebhook: (id: string, webhook_url: string) => req<{ webhook_url: string }>("PUT", `/sessions/${id}/notification-webhook`, { webhook_url }),

  // --- М2.1 Узкие места ---
  getBottlenecks: (id: string) => req<BottleneckReport>("GET", `/sessions/${id}/analytics/bottlenecks`),
  requestTimingGaps: (id: string) => req<{ added: number; gaps: Gap[] }>("POST", `/sessions/${id}/analytics/request-timing-gaps`),

  // --- М2.3 Антипаттерны ---
  getAntipatterns: (id: string) => req<AntipatternFinding[]>("GET", `/sessions/${id}/analytics/antipatterns`),

  // --- М2.2 Трудозатраты и стоимость ---
  listRoleRates: () => req<RoleRate[]>("GET", "/role-rates"),
  setRoleRate: (roleKey: string, role_name: string, rate: number, unit?: string) =>
    req<RoleRate>("PUT", `/role-rates/${encodeURIComponent(roleKey)}`, { role_name, rate, unit }),
  deleteRoleRate: (roleKey: string) => req<void>("DELETE", `/role-rates/${encodeURIComponent(roleKey)}`),
  getCost: (id: string, frequency?: number) => req<CostReport>("GET", `/sessions/${id}/analytics/cost${frequency !== undefined ? `?frequency=${frequency}` : ""}`),
  getSensitivity: (id: string, frequency?: number) =>
    req<SensitivityPoint[]>("GET", `/sessions/${id}/analytics/sensitivity${frequency !== undefined ? `?frequency=${frequency}` : ""}`),
  setFrequency: (id: string, frequency_per_month: number | null) =>
    req<{ frequency_per_month: number | null }>("PUT", `/sessions/${id}/analytics/frequency`, { frequency_per_month }),

  // --- М6.1 Реестр требований ---
  listRequirements: (filters?: { source?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    return req<RequirementRow[]>("GET", `/requirements${qs ? `?${qs}` : ""}`);
  },
  createRequirement: (input: { code: string; title: string; source?: string }) => req<RequirementRow>("POST", "/requirements", input),
  patchRequirement: (id: string, patch: Partial<RequirementRow>) => req<RequirementRow>("PATCH", `/requirements/${id}`, patch),
  deleteRequirement: (id: string) => req<void>("DELETE", `/requirements/${id}`),

  // --- М6.2 Чек-лист процессного подхода ---
  listChecklistRules: () => req<ChecklistRuleRow[]>("GET", "/checklist-rules"),
  setChecklistRuleEnabled: (id: string, enabled: boolean) => req<ChecklistRuleRow>("PATCH", `/checklist-rules/${id}`, { enabled }),
  getChecklist: (id: string) => req<ChecklistResult>("GET", `/sessions/${id}/checklist`),

  // --- М3.3 Карта процессов ---
  getRegistryMap: () => req<RegistryMap>("GET", "/registry/map"),

  // --- М3.4 Поиск дублей ---
  getDuplicates: () => req<DuplicateCandidate[]>("GET", "/registry/duplicates"),
  dismissDuplicate: (aId: string, bId: string) => req<void>("POST", "/registry/duplicates/dismiss", { aId, bId }),

  // --- М6.5 Проверка актуальности ---
  getRegistryStaleness: () => req<StalenessRow[]>("GET", "/registry/staleness"),

  // --- М6.3 Трассировка требований ---
  listRequirementsLinks: (id: string) => req<RequirementLink[]>("GET", `/sessions/${id}/requirements-links`),
  addRequirementsLink: (id: string, requirement_id: string, element_id: string, coverage?: "full" | "partial") =>
    req<SessionRecord>("POST", `/sessions/${id}/requirements-links`, { requirement_id, element_id, coverage }),
  removeRequirementsLink: (id: string, requirement_id: string, element_id: string) =>
    req<SessionRecord>("DELETE", `/sessions/${id}/requirements-links`, { requirement_id, element_id }),
  getTraceability: (id: string) => req<TraceabilityReport>("GET", `/sessions/${id}/traceability`),

  // --- М6.4 Аудит-трейл ---
  listAuditLog: (filters?: { session_id?: string; actor?: string; action?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return req<AuditLogRow[]>("GET", `/audit-log${qs ? `?${qs}` : ""}`);
  },

  // --- М1.2 Должностные инструкции ---
  jobDescriptionPreviewUrl: (id: string, roleId: string) => `${BASE}/sessions/${id}/job-description/${roleId}/preview`,
  jobDescriptionExportHtmlUrl: (id: string, roleId: string) => `${BASE}/sessions/${id}/job-description/${roleId}/export.html`,
  jobDescriptionExportDocxUrl: (id: string, roleId: string) => `${BASE}/sessions/${id}/job-description/${roleId}/export.docx`,
};
