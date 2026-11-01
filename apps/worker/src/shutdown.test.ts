import { describe, expect, it, vi } from "vitest";

import { createShutdownController } from "./shutdown.js";

function harness(
  overrides: { onShutdown?: () => Promise<void>; timeoutMs?: number } = {},
) {
  const exit = vi.fn<(code: number) => void>();
  const log = vi.fn<(line: Record<string, unknown>) => void>();
  const shutdown = createShutdownController({
    exit,
    log,
    ...(overrides.onShutdown ? { onShutdown: overrides.onShutdown } : {}),
    ...(overrides.timeoutMs === undefined ? {} : { timeoutMs: overrides.timeoutMs }),
  });
  return { exit, log, shutdown };
}

describe("shutdown controller", () => {
  it("exits 0 after the shutdown hook resolves", async () => {
    const onShutdown = vi.fn(async () => {});
    const { exit, shutdown } = harness({ onShutdown });

    await shutdown("SIGTERM");

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("runs cleanup once when the signal arrives twice", async () => {
    const onShutdown = vi.fn(async () => {});
    const { exit, log, shutdown } = harness({ onShutdown });

    await Promise.all([shutdown("SIGINT"), shutdown("SIGINT")]);

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ event: "shutdown.duplicate" }),
    );
  });

  it("exits 1 when the shutdown hook rejects", async () => {
    const onShutdown = vi.fn(async () => {
      throw new Error("queue did not drain");
    });
    const { exit, log, shutdown } = harness({ onShutdown });

    await shutdown("SIGTERM");

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "shutdown.failed",
        reason: "queue did not drain",
      }),
    );
  });

  it("exits 1 when the shutdown hook hangs past the timeout", async () => {
    vi.useFakeTimers();
    try {
      const onShutdown = () => new Promise<void>(() => {});
      const { exit, log, shutdown } = harness({ onShutdown, timeoutMs: 50 });

      void shutdown("SIGTERM");
      await vi.advanceTimersByTimeAsync(60);

      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ event: "shutdown.timeout" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
