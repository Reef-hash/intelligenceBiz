import type { LlmProvider, TypedSupabaseClient } from "@intelligencebiz/database";
import type { ChatMessage, KnowledgeBaseEntry } from "./types.js";

export interface AgentConfig {
  personaName: string;
  systemPrompt: string;
  knowledgeBase: KnowledgeBaseEntry[];
  llmProvider: LlmProvider;
  llmModel: string | null;
}

function normalizeKnowledgeBase(raw: unknown[]): KnowledgeBaseEntry[] {
  return raw
    .map((item): KnowledgeBaseEntry | null => {
      if (typeof item === "string") return { content: item };
      if (item && typeof item === "object" && "content" in item) {
        const entry = item as { title?: unknown; content: unknown };
        if (typeof entry.content === "string") {
          return {
            title: typeof entry.title === "string" ? entry.title : undefined,
            content: entry.content,
          };
        }
      }
      return null;
    })
    .filter((entry): entry is KnowledgeBaseEntry => entry !== null);
}

function extractText(content: Record<string, unknown>): string | null {
  return content.type === "text" && typeof content.text === "string" ? content.text : null;
}

export class AgentConfigRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getActiveConfig(tenantId: string): Promise<AgentConfig | null> {
    const { data, error } = await this.supabase
      .from("agent_configs")
      .select("persona_name, system_prompt, knowledge_base, llm_provider, llm_model, is_active")
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // no agent_configs row for this tenant
      throw error;
    }
    if (!data.is_active) return null;

    return {
      personaName: data.persona_name,
      systemPrompt: data.system_prompt,
      knowledgeBase: normalizeKnowledgeBase(data.knowledge_base),
      llmProvider: data.llm_provider,
      llmModel: data.llm_model,
    };
  }

  async getRecentHistory(conversationId: string, limit = 10): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("direction, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data
      .reverse()
      .map((row): ChatMessage | null => {
        const text = extractText(row.content);
        if (!text) return null;
        return { role: row.direction === "inbound" ? "user" : "assistant", content: text };
      })
      .filter((message): message is ChatMessage => message !== null);
  }
}
