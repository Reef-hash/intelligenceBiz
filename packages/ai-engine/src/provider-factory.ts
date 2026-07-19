import type { LlmProvider } from "@intelligencebiz/database";
import type { AiEngineConfig } from "./config.js";
import { ClaudeProvider } from "./providers/claude-provider.js";
import { DeepSeekProvider } from "./providers/deepseek-provider.js";
import { OpenAIProvider } from "./providers/openai-provider.js";
import type { LLMProvider } from "./types.js";

/**
 * Builds the LLMProvider for a tenant's configured backend. Tenants pick
 * their provider (and optionally a model) via agent_configs.llm_provider /
 * llm_model, so a business can bring their own Claude, OpenAI, or DeepSeek
 * API access.
 */
export function createProvider(
  providerName: LlmProvider,
  config: AiEngineConfig,
  defaultModel?: string,
): LLMProvider {
  switch (providerName) {
    case "anthropic": {
      if (!config.anthropicApiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }
      return new ClaudeProvider({ apiKey: config.anthropicApiKey, defaultModel });
    }
    case "openai": {
      if (!config.openaiApiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
      return new OpenAIProvider({ apiKey: config.openaiApiKey, defaultModel });
    }
    case "deepseek": {
      if (!config.deepseekApiKey) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
      }
      return new DeepSeekProvider({ apiKey: config.deepseekApiKey, defaultModel });
    }
  }
}
