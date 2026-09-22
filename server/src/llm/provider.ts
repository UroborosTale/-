import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionChunkResult, LLMFragmentInput, LLMProvider } from "./types.js";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_TOOL, buildChunkUserPrompt } from "./prompts.js";
import { mockExtractChunk } from "./mockProvider.js";

const MODEL_ID = process.env.LLM_MODEL || "claude-sonnet-4-5";

function formatFragments(fragments: LLMFragmentInput[]): string {
  return fragments
    .map((f) => `[${f.id}] (${f.speaker_label ?? f.speaker}): ${f.text}`)
    .join("\n");
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async extractChunk(
    fragments: LLMFragmentInput[],
    context: { processName: string; modelType: "AS-IS" | "TO-BE" }
  ): Promise<ExtractionChunkResult> {
    const msg = await this.client.messages.create({
      model: MODEL_ID,
      max_tokens: 4096,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL as any],
      tool_choice: { type: "tool", name: "extract_process_chunk" },
      messages: [
        {
          role: "user",
          content: buildChunkUserPrompt(context.processName, context.modelType, formatFragments(fragments)),
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use") as
      | Anthropic.ToolUseBlock
      | undefined;
    if (!toolUse) {
      throw new Error("LLM did not return structured tool_use output");
    }
    return toolUse.input as ExtractionChunkResult;
  }
}

/**
 * Детерминированный офлайн-провайдер на правилах и словарях.
 * Используется, когда не настроен внешний LLM (ANTHROPIC_API_KEY),
 * чтобы конвейер работал полностью локально (соответствует НФТ-4 «режим без
 * передачи данных наружу») и был тестируем без сети. Качество извлечения
 * ниже, чем у LLM — это осознанный fallback, а не замена.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  async extractChunk(
    fragments: LLMFragmentInput[],
    context: { processName: string; modelType: "AS-IS" | "TO-BE" }
  ): Promise<ExtractionChunkResult> {
    return mockExtractChunk(fragments, context);
  }
}

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cachedProvider = apiKey ? new AnthropicProvider(apiKey) : new MockProvider();
  return cachedProvider;
}

export function providerStatus(): { name: string; live: boolean } {
  const p = getLLMProvider();
  return { name: p.name, live: p.name !== "mock" };
}
