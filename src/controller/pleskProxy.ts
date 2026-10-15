// src/controller/pleskProxy.ts
import { Request, Response, NextFunction } from "express";
import axios from "axios";

const PLESK_API_KEY = process.env.X_API_KEY || "";
const PLESK_DOMAIN_URL = "https://hostego.net:8443";
const PLESK_IP_URL = `https://${process.env.MAIN_IP || "62.84.185.153"}:${process.env.SERVER_PORT || "8443"}`;

const ALLOWED_ENDPOINTS = [
  "/api/v2/cli/subscription/call",
  "/api/v2/cli/site/call",
];

/**
 * POST /api/admin/plesk/proxy
 * Body: { endpoint: string, body: object }
 *
 * Acts as a secure server-side proxy to Plesk API.
 * The x-api-key is NEVER sent to the client — it stays on the server.
 */
export const pleskProxy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { endpoint, body } = req.body as {
      endpoint: string;
      body: Record<string, unknown>;
    };

    // Validate endpoint to prevent open proxy abuse
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      res.status(400).json({
        message: `Invalid or disallowed Plesk endpoint: ${endpoint}`,
      });
      return;
    }

    if (!PLESK_API_KEY) {
      res.status(500).json({ message: "Plesk API key is not configured on the server." });
      return;
    }

    const urlsToTry = [
      `${PLESK_DOMAIN_URL}${endpoint}`,
      `${PLESK_IP_URL}${endpoint}`,
    ];

    let lastError: unknown = null;

    for (const url of urlsToTry) {
      try {
        const response = await axios.post(url, body, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": PLESK_API_KEY, // ✅ Only on server — never exposed to browser
          },
          timeout: 20000,
        });
        res.json(response.data);
        return;
      } catch (err) {
        lastError = err;
        console.warn(`[pleskProxy] Failed to reach ${url}:`, (err as Error)?.message);
      }
    }

    // All URLs failed
    const errMsg =
      (lastError as { response?: { data?: { message?: string }; }; message?: string })
        ?.response?.data?.message ||
      (lastError as Error)?.message ||
      "All Plesk endpoints failed";

    res.status(502).json({ message: errMsg });
  } catch (err) {
    next(err);
  }
};
