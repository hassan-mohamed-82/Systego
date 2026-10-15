// src/routes/admin/pleskProxy.ts
import { Router } from "express";
import { pleskProxy } from "../../controller/pleskProxy";

const router = Router();

/**
 * POST /api/admin/plesk/proxy
 *
 * Secure server-side proxy to Plesk API.
 * The x-api-key header is injected server-side from env vars —
 * it is NEVER exposed in browser network requests.
 */
router.post("/proxy", pleskProxy);

export default router;
