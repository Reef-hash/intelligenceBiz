"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@intelligencebiz/database";
import { createSessionControlQueue } from "@intelligencebiz/queue";
import { getCurrentUser } from "@/lib/tenant";
import { getRedisConnection } from "@/lib/redis";

/**
 * Creates the tenant's whatsapp_connections row if it doesn't exist yet,
 * then signals whatsapp-worker (via the shared session-control queue) to
 * (re)start the Baileys session. Covers both "connect for the first
 * time" and "re-scan the QR after a logout" — whatsapp-worker's
 * SessionManager.restartTenant() decides which one applies.
 */
export async function connectWhatsApp(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const supabase = createServiceRoleClient();

  const { data: existing, error: lookupError } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("tenant_id", user.tenantId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    const { error: insertError } = await supabase.from("whatsapp_connections").insert({
      tenant_id: user.tenantId,
      connection_type: "unofficial_baileys",
    });
    if (insertError) throw insertError;
  }

  const queue = createSessionControlQueue(getRedisConnection());
  await queue.add("start-session", { tenantId: user.tenantId, action: "start" });

  revalidatePath("/connection");
}
