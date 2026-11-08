import { handle } from "@hono/vercel";

import { app } from "../../../server/app";

// Node, not edge: the API will use Postgres and Node crypto. The Hono app owns
// routing and error handling, so Next only needs to hand every method over.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(app);

export const GET = handler;
export const HEAD = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
