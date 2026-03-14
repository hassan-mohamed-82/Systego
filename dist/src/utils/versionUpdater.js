"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBackend = exports.syncFrontend = exports.syncAll = exports.checkForChanges = void 0;
const axios_1 = __importDefault(require("axios"));
const appError_1 = require("../Errors/appError"); /**
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
const handleAxiosError = (error) => {
    if (error && error.isAxiosError && error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        const message = responseData?.message || responseData?.error || "Version Updater Service Error";
        const details = responseData?.details || responseData;
        throw new appError_1.AppError(message, status, details);
    }
    throw error;
};
/** Dry-run: compare base vs client and return diff report */
const checkForChanges = async (clientName) => {
    try {
        const { data } = await getClient().post("/api/update/check", { clientName });
        return data;
    }
    catch (error) {
        return handleAxiosError(error);
    }
};
exports.checkForChanges = checkForChanges;
/** Full sync: frontend + backend */
const syncAll = async (clientName) => {
    try {
        const { data } = await getClient().post("/api/update/sync", { clientName });
        return data;
    }
    catch (error) {
        return handleAxiosError(error);
    }
};
exports.syncAll = syncAll;
/** Sync frontend only */
const syncFrontend = async (clientName) => {
    try {
        const { data } = await getClient().post("/api/update/sync-frontend", { clientName });
        return data;
    }
    catch (error) {
        return handleAxiosError(error);
    }
};
exports.syncFrontend = syncFrontend;
/** Sync backend only */
const syncBackend = async (clientName) => {
    try {
        const { data } = await getClient().post("/api/update/sync-backend", { clientName });
        return data;
    }
    catch (error) {
        return handleAxiosError(error);
    }
};
exports.syncBackend = syncBackend;
