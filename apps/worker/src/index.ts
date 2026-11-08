import { reportEnvError } from "@loopnote/config/env";

import { loadEnv } from "./env.js";
import { createShutdownController } from "./shutdown.js";

const SERVICE = "worker";
const SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Parsed before anything else so a bad environment prints one line and exits 1,
 * never a stack trace. Anything that is not an environment problem is rethrown.
 */
const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    if (reportEnvError(error)) process.exit(1);
    throw error;
  }
})();

const HEARTBEAT_MS = env.WORKER_HEARTBEAT_MS;

const startedAt = Date.now();

function log(line: Record<string, unknown>): void {
  // process.stdout rather than console, so every line is one JSON object and the
  // no-console lint rule stays on for application code.
  process.stdout.write(
    `${JSON.stringify({ time: new Date().toISOString(), service: SERVICE, ...line })}\n`,
  );
}

let heartbeat: ReturnType<typeof setInterval> | undefined;

const shutdown = createShutdownController({
  exit: (code) => process.exit(code),
  log,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
  onShutdown: async () => {
    if (heartbeat !== undefined) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
  },
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

/**
 * Nothing to process yet. The heartbeat is what keeps the process alive and gives
 * the logs a liveness signal until queues arrive with the ingest module.
 */
heartbeat = setInterval(() => {
  log({ level: "info", event: "worker.heartbeat", uptimeMs: Date.now() - startedAt });
}, HEARTBEAT_MS);

log({
  level: "info",
  event: "worker.started",
  pid: process.pid,
  node: process.version,
  heartbeatMs: HEARTBEAT_MS,
});
