import type { TypedSupabaseClient } from "@intelligencebiz/database";
import { AgentConfigRepository } from "./agent-config-repository.js";
import { loadConfigFromEnv, type AiEngineConfig } from "./config.js";
import { retrieveRelevantEntries } from "./knowledge-retrieval.js";
import { buildSystemPrompt } from "./prompt-builder.js";
import { createProvider } from "./provider-factory.js";

export interface GenerateReplyParams {
  tenantId: string;
  conversationId: string;
}

/**
 * Ties together agent config, knowledge retrieval, prompt building, and
 * provider selection. Deliberately knows nothing about WhatsApp/Baileys or
 * queues — callers (apps/api) resolve a conversationId first, so this
 * class only needs a tenant and a conversation to work with.
 */
export class AiEngine {
  private readonly agentConfigRepository: AgentConfigRepository;

  constructor(
    supabase: TypedSupabaseClient,
    private readonly config: AiEngineConfig = loadConfigFromEnv(),
  ) {
    this.agentConfigRepository = new AgentConfigRepository(supabase);
  }

  /**
   * Returns null when there's nothing to reply with: no active agent
   * config for the tenant, or no inbound message yet in the conversation.
   */
  async generateReply(params: GenerateReplyParams): Promise<string | null> {
    const agentConfig = await this.agentConfigRepository.getActiveConfig(params.tenantId);
    if (!agentConfig) return null;

    // The inbound message that triggered this reply is already the last
    // row in history (the caller persists it before enqueueing), so it's
    // included here rather than passed and appended separately.
    const history = await this.agentConfigRepository.getRecentHistory(params.conversationId);
    if (history.length === 0) return null;

    const latestInboundText = [...history].reverse().find((message) => message.role === "user")?.content ?? "";
    const relevantKnowledge = retrieveRelevantEntries(agentConfig.knowledgeBase, latestInboundText);

    const systemPrompt = buildSystemPrompt({
      personaName: agentConfig.personaName,
      systemPrompt: agentConfig.systemPrompt,
      relevantKnowledge,
    });

    const provider = createProvider(agentConfig.llmProvider, this.config, agentConfig.llmModel ?? undefined);
    const result = await provider.complete({ systemPrompt, messages: history });

    return result.text;
  }
}
