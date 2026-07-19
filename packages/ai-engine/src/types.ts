import type { LlmProvider } from "@intelligencebiz/database";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  systemPrompt: string;
  messages: ChatMessage[];
  /** Overrides the provider's configured default model for this call. */
  model?: string;
}

export interface CompletionResult {
  text: string;
}

/** One backend the ai-engine can route a tenant's replies through. */
export interface LLMProvider {
  readonly name: LlmProvider;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export interface KnowledgeBaseEntry {
  title?: string;
  content: string;
}
