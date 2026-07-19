import OpenAI from "openai";
import type { CompletionRequest, CompletionResult, LLMProvider } from "../types.js";

// DeepSeek's API is OpenAI-compatible (chat completions), reachable via a
// base URL override — no separate SDK needed.
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const MAX_TOKENS = 1024;

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek" as const;

  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(config: { apiKey: string; defaultModel?: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: DEEPSEEK_BASE_URL });
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: request.model ?? this.defaultModel,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    return { text: response.choices[0]?.message?.content ?? "" };
  }
}
