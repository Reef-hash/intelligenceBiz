import { Queue } from "bullmq";
import type { Redis } from "ioredis";

export const SESSION_CONTROL_QUEUE_NAME = "whatsapp-session-control";

export type SessionControlAction = "start" | "stop";

export interface SessionControlJobData {
  tenantId: string;
  action: SessionControlAction;
}

/**
 * Shared contract between apps/web (producer — "connect WhatsApp" /
 * "re-scan QR" actions) and whatsapp-worker (consumer). Lets the worker
 * pick up a newly-connected or newly-reconnecting tenant without a
 * restart, instead of only discovering tenants once at boot.
 */
export function createSessionControlQueue(connection: Redis): Queue<SessionControlJobData> {
  return new Queue<SessionControlJobData>(SESSION_CONTROL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });
}
