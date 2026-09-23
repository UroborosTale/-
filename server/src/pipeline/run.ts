import type { Fragment, ProcessLogicModel } from "../types/model.js";
import { extractModel } from "./extract.js";
import { detectGaps } from "./gaps.js";
import { validateModel } from "./validate.js";
import { generateBpmn } from "./bpmn.js";
import { generateIdef0, type Idef0Result } from "./idef0.js";
import { getLLMProvider } from "../llm/provider.js";
import type { SessionMeta } from "../repo.js";

export interface PipelineOutput {
  model: ProcessLogicModel;
  validation: ReturnType<typeof validateModel>;
  bpmnXml: string;
  idef0: Idef0Result;
  providerName: string;
}

/**
 * Общее ядро конвейера (ФТ-3..ФТ-8), используемое и режимом А, и режимом Б:
 * извлечение → пробелы → валидация → генерация BPMN/IDEF0.
 */
export async function runPipeline(
  processId: string,
  fragments: Fragment[],
  meta: SessionMeta
): Promise<PipelineOutput> {
  const provider = getLLMProvider();
  const model = await extractModel(fragments, provider, {
    processId,
    processName: meta.processName,
    modelType: meta.modelType,
    department: meta.department,
    owner: meta.owner,
    decompositionDepth: meta.decompositionDepth,
  });

  model.gaps = detectGaps(model);
  const validation = validateModel(model);
  const bpmn = await generateBpmn(model);
  const idef0 = generateIdef0(model);

  return { model, validation, bpmnXml: bpmn.xml, idef0, providerName: provider.name };
}
