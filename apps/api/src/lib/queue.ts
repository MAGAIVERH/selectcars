import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { env } from "../env";

/**
 * The work queue.
 *
 * This module exists so that one rule can be enforced in one place: **nothing expensive
 * happens inside a request**. Computing insights reads the whole marketplace and, when a
 * model is configured, waits on a network call to it. A dealer clicking "refresh" gets a
 * job id back in milliseconds; the work lands in the dashboard when it is done.
 *
 * Redis is optional at boot, exactly like storage: without it the API serves everything else
 * and only the insight endpoints answer 503 naming what is missing. A queue that is not
 * configured is a switched-off feature, not a broken service.
 */

export const INSIGHTS_QUEUE = "insights";

/** One job: recompute everything for one dealership. */
export type InsightJob = { tenantId: string };

export function isQueueConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

/**
 * BullMQ wants host/port rather than a URL, and it needs `maxRetriesPerRequest: null`: its
 * blocking commands sit on the connection for a long time, and ioredis' default retry cap
 * would tear them down mid-wait.
 */
export function redisConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL as string);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue<InsightJob> | null = null;

export function insightsQueue(): Queue<InsightJob> {
  if (!isQueueConfigured()) throw new Error("REDIS_URL is not set, so there is no queue.");
  if (!queue) {
    queue = new Queue<InsightJob>(INSIGHTS_QUEUE, {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        /**
         * Forget the job the moment it settles, either way.
         *
         * This looks like throwing away debugging history, and the first version did keep a
         * tail (`removeOnComplete: 20`). It is wrong here, because of how the dedupe below
         * works: a job's custom id stays claimed for as long as the job exists in Redis. A
         * retained completed run would therefore make the dealer's next "Run again" a silent
         * no-op, and a retained failed run would block the retry. Removing on settle is what
         * makes "one run at a time, but always another run available" true.
         *
         * Nothing is actually lost: the result lives in Postgres and every run is logged.
         */
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }
  return queue;
}

/**
 * Queue a run for one dealership, collapsing into any run already waiting for it.
 *
 * The job id is derived from the tenant id, so a dealer hammering the button does not stack
 * twenty identical jobs: BullMQ keeps the first and ignores the rest until it has run.
 *
 * The separator is a hyphen, not a colon. BullMQ uses `:` to build its own Redis keys and
 * rejects a custom id containing one, which the first version of this line learned by
 * answering 500 to every refresh.
 */
export async function enqueueInsights(tenantId: string): Promise<string> {
  const jobId = `insights-${tenantId}`;
  const job = await insightsQueue().add("recompute", { tenantId }, { jobId });
  return job.id ?? jobId;
}
