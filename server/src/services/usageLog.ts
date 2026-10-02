export interface UsageLogEntry {
  jobId: string;
  stage: string;
  inputTokens: number;
  outputTokens: number;
  loggedAt: string;
}

/**
 * Every LLM call's token usage gets logged against the job it came from.
 * In-memory here; the "Cost & usage logging" issue is where this grows
 * into per-user/per-image cost queries and a real store — this class is
 * deliberately just the recording primitive that issue builds on.
 */
export class UsageLog {
  private entries: UsageLogEntry[] = [];

  record(entry: Omit<UsageLogEntry, "loggedAt">): void {
    const full: UsageLogEntry = { ...entry, loggedAt: new Date().toISOString() };
    this.entries.push(full);
    // eslint-disable-next-line no-console
    console.log(
      `[usage] job=${full.jobId} stage=${full.stage} inputTokens=${full.inputTokens} outputTokens=${full.outputTokens}`
    );
  }

  all(): UsageLogEntry[] {
    return [...this.entries];
  }

  forJob(jobId: string): UsageLogEntry[] {
    return this.entries.filter((e) => e.jobId === jobId);
  }
}
