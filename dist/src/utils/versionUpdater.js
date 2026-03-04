"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBackend = exports.syncFrontend = exports.syncAll = exports.checkForChanges = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Reusable axios client for the PleskVersionUpdater microservice.
 * Reads config from environment variables:
 *   - VERSION_UPDATER_URL  (e.g. http://localhost:3500)
 *   - VERSION_UPDATER_API_KEY
 */
const getClient = () => {
    const baseURL = process.env.VERSION_UPDATER_URL;
    const apiKey = process.env.VERSION_UPDATER_API_KEY;
    if (!baseURL) {
        throw new Error("VERSION_UPDATER_URL is not configured in .env");
    }
    if (!apiKey) {
        throw new Error("VERSION_UPDATER_API_KEY is not configured in .env");
    }
    return axios_1.default.create({
        baseURL,
        timeout: 120000, // 2 minutes — syncs can take a while
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
    });
};
// ─── Public helpers ────────────────────────────────────────────────
/** Dry-run: compare base vs client and return diff report */
const checkForChanges = async (clientName) => {
    const { data } = await getClient().post("/api/update/check", { clientName });
    return data;
};
exports.checkForChanges = checkForChanges;
/** Full sync: frontend + backend */
const syncAll = async (clientName) => {
    const { data } = await getClient().post("/api/update/sync", { clientName });
    return data;
};
exports.syncAll = syncAll;
/** Sync frontend only */
const syncFrontend = async (clientName) => {
    const { data } = await getClient().post("/api/update/sync-frontend", { clientName });
    return data;
};
exports.syncFrontend = syncFrontend;
/** Sync backend only */
const syncBackend = async (clientName) => {
    const { data } = await getClient().post("/api/update/sync-backend", { clientName });
    return data;
};
exports.syncBackend = syncBackend;
