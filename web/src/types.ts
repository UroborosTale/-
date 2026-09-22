export type Speaker = "interviewer" | "owner" | "participant" | "unknown";

export interface Fragment {
  id: string;
  index: number;
  speaker: Speaker;
  speaker_label?: string;
  text: string;
}

export interface SourceRef {
  fragment_id: string;
  quote: string;
}

export interface Role {
  id: string;
  name: string;
  kind: "internal" | "external";
  source: SourceRef[];
}

export interface SystemEntity {
  id: string;
  name: string;
  source: SourceRef[];
}

export interface DataEntity {
  id: string;
  name: string;
  kind: "document" | "data";
  source: SourceRef[];
}

export interface ControlEntity {
  id: string;
  name: string;
  kind: "regulation" | "rule" | "norm";
  source: SourceRef[];
}

export interface ProcessNode {
  id: string;
  type: "task" | "event" | "gateway" | "subprocess";
  subtype?: string;
  name: string;
  role_id?: string | null;
  system_ids: string[];
  inputs: string[];
  outputs: string[];
  controls: string[];
  duration?: string | null;
  frequency?: string | null;
  idef0_parent?: string | null;
  status: "confirmed" | "hypothesis";
  confidence: number;
  source: SourceRef[];
}

export interface ProcessFlow {
  id: string;
  from: string;
  to: string;
  condition?: string | null;
  source: SourceRef[];
}

export type GapPriority = "critical" | "important" | "desirable";

export interface Gap {
  id: string;
  rule: string;
  priority: GapPriority;
  element_id: string | null;
  question: string;
  status: "open" | "answered" | "dismissed";
  topic?: string;
}

export interface Statement {
  id: string;
  kind: "problem" | "proposal";
  text: string;
  source: SourceRef[];
}

export interface ProcessMeta {
  id: string;
  name: string;
  owner?: string;
  department?: string;
  type: "AS-IS" | "TO-BE";
  goal?: string;
  trigger?: string;
  result?: string;
  decomposition_depth: number;
  notations: ("IDEF0" | "BPMN")[];
}

export interface ProcessLogicModel {
  schema_version: string;
  process: ProcessMeta;
  roles: Role[];
  systems: SystemEntity[];
  data: DataEntity[];
  controls: ControlEntity[];
  nodes: ProcessNode[];
  flows: ProcessFlow[];
  gaps: Gap[];
  statements: Statement[];
}

export interface ValidationIssue {
  id: string;
  notation: "BPMN" | "IDEF0" | "MODEL";
  severity: "error" | "warning";
  rule: string;
  message: string;
  element_id: string | null;
}

export interface ChatMessage {
  id: string;
  role: "system" | "assistant" | "owner";
  text: string;
  ts: number;
  gap_id?: string | null;
}

export interface Idef0Block {
  nodeId: string;
  code: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Idef0Result {
  contextSvg: string;
  decompositionSvg: string;
  nodeTreeSvg: string;
  blocks: Idef0Block[];
  width: number;
  height: number;
}

export interface SessionMeta {
  processName: string;
  department?: string;
  owner?: string;
  modelType: "AS-IS" | "TO-BE";
  decompositionDepth: number;
  notations: ("IDEF0" | "BPMN")[];
}

export interface Comment {
  id: string;
  element_id: string | null;
  text: string;
  author: string;
  ts: string;
}

export interface VersionSnapshot {
  version: number;
  ts: string;
  note: string;
  model: ProcessLogicModel;
}

export interface SessionRecord {
  id: string;
  title: string;
  mode: "A" | "B";
  status: "draft" | "processing" | "ready" | "interviewing" | "completed";
  meta: SessionMeta;
  fragments: Fragment[];
  rawText: string;
  model: ProcessLogicModel | null;
  validation: ValidationIssue[];
  bpmnXml: string | null;
  idef0: Idef0Result | null;
  chat: ChatMessage[];
  versions: VersionSnapshot[];
  comments: Comment[];
  qa: { gapId: string; question: string; answerText: string; ts: string }[];
  diagramsStale: boolean;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  mode: "A" | "B";
  status: SessionRecord["status"];
  meta: SessionMeta;
  updatedAt: string;
  createdAt: string;
  gapsOpen: number;
  hasErrors: boolean;
  diagramsStale: boolean;
}
