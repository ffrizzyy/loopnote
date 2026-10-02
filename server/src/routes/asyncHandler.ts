import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 doesn't await handlers, so a rejected promise from an async
 * route never reaches the error middleware — the request hangs and the
 * unhandled rejection takes the process down. This forwards it to next()
 * instead.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
