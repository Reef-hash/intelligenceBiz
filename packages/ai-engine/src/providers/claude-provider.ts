import Anthropic from "@anthropic-ai/sdk";
import type { CompletionRequest, CompletionResult, LLMProvider } from "../types.js";

// Tenants can override via agent_configs.llm_model; this is only the
// fallback when they haven't set one.
const DEFAULT_MODEL = "claude-opus-4-8";
const MAX_TOKENS = 1024;

export class ClaudeProvider implements LLMProvider {
  readonly name = "anthropic" as const;

  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(config: { apiKey: string; defaultModel?: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: request.model ?? this.defaultModel,
      max_tokens: MAX_TOKENS,
      system: request.systemPrompt,
      messages: request.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { text };
  }
}
