import { randomUUID } from "node:crypto";
import { DetectionRecord, ImportJob, JobStatus, SummarizationRecord } from "../types";

export interface CreateJobInput {
  imageHash: string;
  originalFilename: string;
  storedPath: string;
}

/**
 * Storage for import jobs, keyed by id, with a secondary index by image
 * hash so callers can dedup before ever creating a new job.
 *
 * In-memory for the scaffold stage. The "Design data model & persistence"
 * issue replaces this with a real DB-backed implementation; routes only
 * depend on this interface, not on how it's stored, so that swap shouldn't
 * touch route code.
 */
export class JobsRepository {
  private byId = new Map<string, ImportJob>();
  private idByHash = new Map<string, string>();

  findByHash(imageHash: string): ImportJob | undefined {
    const id = this.idByHash.get(imageHash);
    return id ? this.byId.get(id) : undefined;
  }

  get(id: string): ImportJob | undefined {
    return this.byId.get(id);
  }

  create(input: CreateJobInput): ImportJob {
    const now = new Date().toISOString();
    const job: ImportJob = {
      id: randomUUID(),
      imageHash: input.imageHash,
      originalFilename: input.originalFilename,
      storedPath: input.storedPath,
      status: "queued",
      error: null,
      detection: null,
      summarization: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(job.id, job);
    this.idByHash.set(job.imageHash, job.id);
    return job;
  }

  updateStatus(id: string, status: JobStatus, error: string | null = null): ImportJob {
    const job = this.byId.get(id);
    if (!job) {
      throw new Error(`No job with id ${id}`);
    }
    job.status = status;
    job.error = error;
    job.updatedAt = new Date().toISOString();
    return job;
  }

  attachDetection(id: string, detection: DetectionRecord): ImportJob {
    const job = this.byId.get(id);
    if (!job) {
      throw new Error(`No job with id ${id}`);
    }
    job.detection = detection;
    job.updatedAt = new Date().toISOString();
    return job;
  }

  attachSummarization(id: string, summarization: SummarizationRecord): ImportJob {
    const job = this.byId.get(id);
    if (!job) {
      throw new Error(`No job with id ${id}`);
    }
    job.summarization = summarization;
    job.updatedAt = new Date().toISOString();
    return job;
  }

  markReviewed(id: string): ImportJob {
    const job = this.byId.get(id);
    if (!job) {
      throw new Error(`No job with id ${id}`);
    }
    job.reviewedAt = new Date().toISOString();
    job.updatedAt = job.reviewedAt;
    return job;
  }

  /** Removes a job entirely — used on discard, so a discarded item is
   * actually gone rather than just hidden behind a reviewed flag. */
  remove(id: string): void {
    const job = this.byId.get(id);
    if (job) {
      this.idByHash.delete(job.imageHash);
    }
    this.byId.delete(id);
  }

  all(): ImportJob[] {
    return Array.from(this.byId.values());
  }
}
