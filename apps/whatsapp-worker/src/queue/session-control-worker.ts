import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { SESSION_CONTROL_QUEUE_NAME, type SessionControlJobData } from "@intelligencebiz/queue";
import type { Logger } from "@intelligencebiz/shared";
import type { SessionManager } from "../session-manager.js";

export function createSessionControlWorker(
  connection: Redis,
  sessionManager: SessionManager,
  logger: Logger,
): Worker<SessionControlJobData> {
  const worker = new Worker<SessionControlJobData>(
    SESSION_CONTROL_QUEUE_NAME,
    async (job: Job<SessionControlJobData>) => {
      const { tenantId, action } = job.data;
      if (action === "start") {
        await sessionManager.restartTenant(tenantId);
      } else {
        await sessionManager.stopTenant(tenantId);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    logger.error("session control job failed", {
      jobId: job?.id,
      tenantId: job?.data?.tenantId,
      err: String(err),
    });
  });

  return worker;
}
