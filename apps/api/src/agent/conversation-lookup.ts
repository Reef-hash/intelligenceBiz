import type { TypedSupabaseClient } from "@intelligencebiz/database";

/**
 * Resolves the conversation a customer message belongs to. Returns null
 * both when there's no conversation yet (shouldn't happen — the worker
 * upserts one before this queue job is enqueued) and when a human has
 * taken over the conversation, since the AI should not auto-reply then.
 */
export async function findConversationId(
  supabase: TypedSupabaseClient,
  tenantId: string,
  customerPhone: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("customer_phone", customerPhone)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data.status === "human_takeover" ? null : data.id;
}
