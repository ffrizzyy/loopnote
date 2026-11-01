export type ShutdownSignal = "SIGINT" | "SIGTERM";

export interface ShutdownDeps {
  /** Called exactly once with the process exit code. */
  readonly exit: (code: number) => void;
  /** Structured log sink. Never throws. */
  readonly log: (line: Record<string, unknown>) => void;
  /** Work to finish before exiting. Optional: the worker has no queues yet. */
  readonly onShutdown?: () => Promise<void>;
  /** How long to wait for onShutdown before exiting non-zero. Default 5000 ms. */
  readonly timeoutMs?: number;
}

/**
 * Builds the signal handler for the worker.
 *
 * The first signal starts a graceful stop. A second signal while the first is still
 * running is logged and ignored, so a repeated Ctrl+C cannot run cleanup twice. If
 * cleanup hangs past the timeout, the process exits non-zero rather than hanging
 * forever, which is what makes a container restart work.
 */
export function createShutdownController(deps: ShutdownDeps) {
  const timeoutMs = deps.timeoutMs ?? 5000;
  let started = false;

  return async function shutdown(signal: ShutdownSignal): Promise<void> {
    if (started) {
      deps.log({ level: "warn", event: "shutdown.duplicate", signal });
      return;
    }
    started = true;
    deps.log({ level: "info", event: "shutdown.started", signal, timeoutMs });

    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      deps.log({ level: "error", event: "shutdown.timeout", signal, timeoutMs });
      deps.exit(1);
    }, timeoutMs);
    timer.unref?.();

    const finish = (code: number, event: string, extra?: Record<string, unknown>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      deps.log({ level: code === 0 ? "info" : "error", event, signal, ...extra });
      deps.exit(code);
    };

    try {
      await deps.onShutdown?.();
      finish(0, "shutdown.complete");
    } catch (error) {
      finish(1, "shutdown.failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  };
}
