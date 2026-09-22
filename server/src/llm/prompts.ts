export const EXTRACTION_SYSTEM_PROMPT = `Ты — модуль извлечения структуры бизнес-процесса из текста интервью для системы построения моделей IDEF0 и BPMN.

Правила:
1. Используй ТОЛЬКО факты из предоставленных фрагментов. Ничего не придумывай.
2. Каждый извлечённый элемент обязан ссылаться на fragment_id и содержать дословную цитату (quote) из этого фрагмента, подтверждающую элемент.
3. Реплики интервьюера (speaker=interviewer) — это только контекст для понимания вопроса. Не создавай из них факты о процессе, но можно на них ссылаться, если ответ на них короткий ("да", "верно").
4. Действия называй в формате "глагол в инфинитиве + объект" (например: "согласовать заявку", "передать документ в бухгалтерию").
5. События называй в формате "состояние объекта" (например: "заявка одобрена", "договор подписан").
6. Разделяй факты AS-IS от пожеланий (proposal, TO-BE) и проблем/болей (problem) — они уходят в statements, а не в nodes.
7. Если формулировка содержит маркеры неопределённости ("обычно", "иногда", "бывает", "как правило") — всё равно извлеки как node/flow, но confidence должен быть ниже (0.3-0.6).
8. order_hint — целое число, отражающее порядок действия по смыслу текста (для последующей сборки потока).
9. Отвечай строго вызовом инструмента extract_process_chunk, без свободного текста.`;

export function buildChunkUserPrompt(
  processName: string,
  modelType: string,
  fragmentsText: string
): string {
  return `Процесс: "${processName}". Тип модели: ${modelType}.

Фрагменты интервью (speaker=owner/participant — факты процесса, speaker=interviewer — вопросы для контекста):

${fragmentsText}

Извлеки роли, системы, документы/данные, регламенты, действия/события/ветвления (nodes), связи между ними (flows, по order_hint), и отдельно проблемы/пожелания (statements). Вызови инструмент extract_process_chunk.`;
}

export const EXTRACTION_TOOL = {
  name: "extract_process_chunk",
  description:
    "Структурированное извлечение элементов бизнес-процесса из фрагмента текста интервью.",
  input_schema: {
    type: "object" as const,
    required: ["roles", "systems", "data", "controls", "nodes", "flows", "statements", "process_hints"],
    properties: {
      roles: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "kind", "source_fragment_id", "quote", "confidence"],
          properties: {
            name: { type: "string" },
            kind: { enum: ["internal", "external"] },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      systems: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "source_fragment_id", "quote", "confidence"],
          properties: {
            name: { type: "string" },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      data: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "kind", "source_fragment_id", "quote", "confidence"],
          properties: {
            name: { type: "string" },
            kind: { enum: ["document", "data"] },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      controls: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "kind", "source_fragment_id", "quote", "confidence"],
          properties: {
            name: { type: "string" },
            kind: { enum: ["regulation", "rule", "norm"] },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      nodes: {
        type: "array",
        items: {
          type: "object",
          required: ["type", "name", "order_hint", "source_fragment_id", "quote", "confidence"],
          properties: {
            type: { enum: ["task", "event", "gateway", "subprocess"] },
            subtype: { type: "string" },
            name: { type: "string" },
            role_name: { type: ["string", "null"] },
            system_names: { type: "array", items: { type: "string" } },
            input_names: { type: "array", items: { type: "string" } },
            output_names: { type: "array", items: { type: "string" } },
            control_names: { type: "array", items: { type: "string" } },
            duration: { type: ["string", "null"] },
            frequency: { type: ["string", "null"] },
            condition_branches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  next_hint: { type: "string" },
                },
              },
            },
            order_hint: { type: "number" },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      flows: {
        type: "array",
        items: {
          type: "object",
          required: ["from_order_hint", "to_order_hint", "source_fragment_id", "quote"],
          properties: {
            from_order_hint: { type: "number" },
            to_order_hint: { type: "number" },
            condition: { type: ["string", "null"] },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
          },
        },
      },
      statements: {
        type: "array",
        items: {
          type: "object",
          required: ["kind", "text", "source_fragment_id", "quote"],
          properties: {
            kind: { enum: ["problem", "proposal"] },
            text: { type: "string" },
            source_fragment_id: { type: "string" },
            quote: { type: "string" },
          },
        },
      },
      process_hints: {
        type: "object",
        properties: {
          goal: { type: ["string", "null"] },
          trigger: { type: ["string", "null"] },
          result: { type: ["string", "null"] },
        },
      },
    },
  },
};
