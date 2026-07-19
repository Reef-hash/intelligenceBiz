import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import type { SendMessageResult } from "@intelligencebiz/channel-core";
import { outgoingQueueName, type OutgoingJobData } from "@intelligencebiz/queue";
import type { Logger } from "@intelligencebiz/shared";

export function createOutgoingWorker(
  tenantId: string,
  connection: Redis,
  options: {
    rateLimit: number;
    rateWindowMs: number;
    logger: Logger;
    sendMessage: (job: OutgoingJobData) => Promise<SendMessageResult>;
    onSent: (job: OutgoingJobData, result: SendMessageResult) => Promise<void>;
  },
): Worker<OutgoingJobData> {
  const worker = new Worker<OutgoingJobData>(
    outgoingQueueName(tenantId),
    async (job: Job<OutgoingJobData>) => {
      const result = await options.sendMessage(job.data);
      await options.onSent(job.data, result);
      return result;
    },
    {
      connection,
      limiter: { max: options.rateLimit, duration: options.rateWindowMs },
    },
  );

  worker.on("failed", (job, err) => {
    options.logger.error("outgoing message job failed", {
      tenantId,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      err: String(err),
    });
  });

  return worker;
}
