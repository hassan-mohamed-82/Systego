import axios from "axios";

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

    return axios.create({
        baseURL,
        timeout: 120_000, // 2 minutes — syncs can take a while
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
    });
};

// ─── Public helpers ────────────────────────────────────────────────

/** Dry-run: compare base vs client and return diff report */
export const checkForChanges = async (clientName: string) => {
    const { data } = await getClient().post("/api/update/check", { clientName });
    return data;
};

/** Full sync: frontend + backend */
export const syncAll = async (clientName: string) => {
    const { data } = await getClient().post("/api/update/sync", { clientName });
    return data;
};

/** Sync frontend only */
export const syncFrontend = async (clientName: string) => {
    const { data } = await getClient().post("/api/update/sync-frontend", { clientName });
    return data;
};

/** Sync backend only */
export const syncBackend = async (clientName: string) => {
    const { data } = await getClient().post("/api/update/sync-backend", { clientName });
    return data;
};
