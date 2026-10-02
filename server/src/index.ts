import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app";

// Nothing else loads .env, so without this the DATABASE_URL / IMAGES_DIR
// set per the README are silently ignored and the DB falls back to
// ":memory:". A server-local .env is checked before the repo-root one the
// README says to create; real environment variables win over both
// (loadEnvFile never overwrites a variable that's already set).
for (const envPath of [path.resolve(__dirname, "../.env"), path.resolve(__dirname, "../../.env")]) {
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

const port = Number(process.env.PORT) || 4000;
const { app } = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`loopnote server listening on :${port}`);
});
