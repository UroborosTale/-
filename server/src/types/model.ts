import { z } from "zod";

/**
 * Process Logic JSON — единый источник истины для IDEF0 и BPMN (ТЗ, раздел 5).
 * Схема версионируется (SCHEMA_VERSION) и публикуется как контракт.
 */
export const SCHEMA_VERSION = "1.0.0";

export const SourceRef = z.object({
  fragment_id: z.string(),
  quote: z.string(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const Role = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["internal", "external"]).default("internal"),
  source: z.array(SourceRef).default([]),
});
export type Role = z.infer<typeof Role>;

export const SystemEntity = z.object({
  id: z.string(),
  name: z.string(),
  source: z.array(SourceRef).default([]),
});
export type SystemEntity = z.infer<typeof SystemEntity>;

export const DataEntity = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["document", "data"]).default("document"),
  source: z.array(SourceRef).default([]),
});
export type DataEntity = z.infer<typeof DataEntity>;

export const ControlEntity = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["regulation", "rule", "norm"]).default("rule"),
  source: z.array(SourceRef).default([]),
});
export type ControlEntity = z.infer<typeof ControlEntity>;

export const NodeType = z.enum(["task", "event", "gateway", "subprocess"]);
export type NodeType = z.infer<typeof NodeType>;

// task subtypes
export const TaskSubtype = z.enum(["user", "service", "manual", "send", "receive", "script"]);
// event subtypes
export const EventSubtype = z.enum([
  "start",
  "end",
  "intermediate",
  "timer",
  "message",
  "error",
  "signal",
]);
// gateway subtypes
export const GatewaySubtype = z.enum(["exclusive", "parallel", "inclusive", "event_based"]);

export const ProcessNode = z.object({
  id: z.string(),
  type: NodeType,
  subtype: z.string().optional(),
  name: z.string(),
  role_id: z.string().nullable().optional(),
  system_ids: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]), // data entity ids
  outputs: z.array(z.string()).default([]), // data entity ids
  controls: z.array(z.string()).default([]), // control entity ids
  duration: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  idef0_parent: z.string().nullable().optional(),
  status: z.enum(["confirmed", "hypothesis"]).default("hypothesis"),
  confidence: z.number().min(0).max(1).default(0.5),
  source: z.array(SourceRef).default([]),
  note: z.string().optional(),
});
export type ProcessNode = z.infer<typeof ProcessNode>;

export const ProcessFlow = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  condition: z.string().nullable().optional(),
  source: z.array(SourceRef).default([]),
});
export type ProcessFlow = z.infer<typeof ProcessFlow>;

export const GapPriority = z.enum(["critical", "important", "desirable"]);
export const GapStatus = z.enum(["open", "answered", "dismissed"]);

export const Gap = z.object({
  id: z.string(),
  rule: z.string(),
  priority: GapPriority,
  element_id: z.string().nullable(),
  question: z.string(),
  status: GapStatus.default("open"),
  topic: z.string().optional(), // for interview "no more than N questions per topic"
  asked_count: z.number().default(0),
});
export type Gap = z.infer<typeof Gap>;

export const Statement = z.object({
  id: z.string(),
  kind: z.enum(["problem", "proposal"]),
  text: z.string(),
  source: z.array(SourceRef).default([]),
});
export type Statement = z.infer<typeof Statement>;

export const ProcessMeta = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string().optional(),
  department: z.string().optional(),
  type: z.enum(["AS-IS", "TO-BE"]).default("AS-IS"),
  goal: z.string().optional(),
  trigger: z.string().optional(),
  result: z.string().optional(),
  decomposition_depth: z.number().default(2),
  notations: z.array(z.enum(["IDEF0", "BPMN"])).default(["IDEF0", "BPMN"]),
});
export type ProcessMeta = z.infer<typeof ProcessMeta>;

export const ProcessLogicModel = z.object({
  schema_version: z.string().default(SCHEMA_VERSION),
  process: ProcessMeta,
  roles: z.array(Role).default([]),
  systems: z.array(SystemEntity).default([]),
  data: z.array(DataEntity).default([]),
  controls: z.array(ControlEntity).default([]),
  nodes: z.array(ProcessNode).default([]),
  flows: z.array(ProcessFlow).default([]),
  gaps: z.array(Gap).default([]),
  statements: z.array(Statement).default([]),
});
export type ProcessLogicModel = z.infer<typeof ProcessLogicModel>;

export function emptyModel(meta: Partial<ProcessMeta> & { id: string; name: string }): ProcessLogicModel {
  return ProcessLogicModel.parse({
    schema_version: SCHEMA_VERSION,
    process: {
      id: meta.id,
      name: meta.name,
      owner: meta.owner,
      department: meta.department,
      type: meta.type ?? "AS-IS",
      goal: meta.goal,
      trigger: meta.trigger,
      result: meta.result,
      decomposition_depth: meta.decomposition_depth ?? 2,
      notations: meta.notations ?? ["IDEF0", "BPMN"],
    },
    roles: [],
    systems: [],
    data: [],
    controls: [],
    nodes: [],
    flows: [],
    gaps: [],
    statements: [],
  });
}

// --- Text fragment & speaker types (ФТ-1) ---

export const Speaker = z.enum(["interviewer", "owner", "participant", "unknown"]);
export type Speaker = z.infer<typeof Speaker>;

export const Fragment = z.object({
  id: z.string(),
  index: z.number(),
  speaker: Speaker,
  speaker_label: z.string().optional(),
  text: z.string(),
});
export type Fragment = z.infer<typeof Fragment>;

// --- Validation types (ФТ-5) ---

export const ValidationSeverity = z.enum(["error", "warning"]);
export const ValidationIssue = z.object({
  id: z.string(),
  notation: z.enum(["BPMN", "IDEF0", "MODEL"]),
  severity: ValidationSeverity,
  rule: z.string(),
  message: z.string(),
  element_id: z.string().nullable(),
});
export type ValidationIssue = z.infer<typeof ValidationIssue>;

// --- Chat / interview types (режим Б) ---

export const ChatMessage = z.object({
  id: z.string(),
  role: z.enum(["system", "assistant", "owner"]),
  text: z.string(),
  ts: z.number(),
  gap_id: z.string().nullable().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;
