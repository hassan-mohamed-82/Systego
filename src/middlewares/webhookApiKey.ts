import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { UnauthorizedError } from "../Errors";

/**
 * Public e-commerce order status endpoints are not protected by a JWT.
 * They are protected by a shared API key sent in the `x-api-key` header.
 *
 * The key is the one issued by Super Systego Back for **this** tenant and
 * provisioned in `SUPER_SYSTEGO_API_KEY`. Each tenant has its own key, and
 * each tenant runs its own backend + database, so only this tenant's key is
 * accepted here. Any other tenant's key is rejected with 401.
 *
 * The comparison is local on purpose: it avoids calling Super Systego on every
 * callback and keeps the endpoint available even if Super Systego is down.
 */
const getExpectedApiKey = (): string =>
  (process.env.SUPER_SYSTEGO_API_KEY || "").trim();

/** Constant-time comparison to avoid leaking the key through timing. */
const keysMatch = (provided: string, expected: string): boolean => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

export const requireWebhookApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const expected = getExpectedApiKey();

  // Fail closed: a public endpoint must never accept requests when the
  // expected key is missing from the environment.
  if (!expected) {
    res.status(503).json({
      success: false,
      error: {
        code: 503,
        message:
          "Webhook API key is not configured. Set SUPER_SYSTEGO_API_KEY.",
      },
    });
    return;
  }

  const headerValue = req.headers["x-api-key"];
  const provided = Array.isArray(headerValue)
    ? String(headerValue[0] || "").trim()
    : String(headerValue || "").trim();

  if (!provided || !keysMatch(provided, expected)) {
    throw new UnauthorizedError("Invalid or missing x-api-key");
  }

  next();
};
