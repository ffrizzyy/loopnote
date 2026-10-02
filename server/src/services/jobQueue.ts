import { ImportJob } from "../types";
import { JobsRepository } from "./jobsRepository";

export type JobProcessor = (job: ImportJob) => Promise<void>;

/**
 * Picks up queued jobs and runs them one at a time, off the request path,
 * so POST /imports can return before processing finishes.
 *
 * This is an in-process stand-in for a real worker (e.g. BullMQ + Redis,
 * per REDIS_URL in .env.example). Routes and tests only depend on
 * enqueue()/waitForIdle(), so swapping the implementation later shouldn't
 * require touching route code.
 */
export class JobQueue {
  private pendingIds: string[] = [];
  private draining = false;
  private idlePromise: Promise<void> = Promise.resolve();
  private resolveIdle: (() => void) | null = null;

  constructor(
    private readonly repo: JobsRepository,
    private readonly process: JobProcessor
  ) {}

  enqueue(jobId: string): void {
    this.pendingIds.push(jobId);
    if (!this.draining) {
      this.idlePromise = new Promise((resolve) => {
        this.resolveIdle = resolve;
      });
      this.draining = true;
      // Defer to a fresh macrotask. drain() mutates job status starting
      // synchronously up to its first await — without this, a caller like
      // POST /imports (still finishing its own response after enqueue())
      // could observe a job flip to "processing" before it ever sees the
      // "queued" state it just created.
      setImmediate(() => {
        void this.drain();
      });
    }
  }

  /** Resolves once every currently-enqueued job has finished. Test-only hook. */
  waitForIdle(): Promise<void> {
    return this.idlePromise;
  }

  private async drain(): Promise<void> {
    // try/finally: if anything below throws unexpectedly, `draining` must
    // still reset — otherwise enqueue() never starts another drain and
    // every later job sits in "queued" forever.
    try {
      let nextId: string | undefined;
      // eslint-disable-next-line no-cond-assign
      while ((nextId = this.pendingIds.shift()) !== undefined) {
        const job = this.repo.get(nextId);
        if (!job) continue;

        this.repo.updateStatus(job.id, "processing");
        try {
          await this.process(job);
          this.repo.updateStatus(job.id, "done");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // The job may have been removed while it was processing.
          if (this.repo.get(job.id)) this.repo.updateStatus(job.id, "failed", message);
        }
      }
    } finally {
      this.draining = false;
      this.resolveIdle?.();
    }
  }
}
