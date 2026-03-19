"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = clearCache;
exports.getTenantInfo = getTenantInfo;
exports.getFeatures = getFeatures;
const axios_1 = __importDefault(require("axios"));
// ─── Cache ─────────────────────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cachedData = null;
let cachedAt = 0;
function isCacheValid() {
    return cachedData !== null && (Date.now() - cachedAt) < CACHE_TTL_MS;
}
/**
 * Force clear the cache. Next call to getFeatures/getTenantInfo will
 * make a fresh request to Super Systego.
 */
function clearCache() {
    cachedData = null;
    cachedAt = 0;
}
// ─── API Client ────────────────────────────────────────────────────
function getClient() {
    const baseURL = process.env.SUPER_SYSTEGO_URL;
    const apiKey = process.env.SUPER_SYSTEGO_API_KEY;
    if (!baseURL) {
        throw new Error("SUPER_SYSTEGO_URL is not configured in .env");
    }
    if (!apiKey) {
        throw new Error("SUPER_SYSTEGO_API_KEY is not configured in .env");
    }
    return axios_1.default.create({
        baseURL,
        timeout: 10000, // 10 seconds
        headers: {
            "Content-Type": "application/json",
            "X-Tenant-Api-Key": apiKey,
        },
    });
}
// ─── Public Helpers ────────────────────────────────────────────────
/**
 * Fetches the full tenant info from Super Systego.
 * Results are cached for 10 minutes.
 */
async function getTenantInfo() {
    if (isCacheValid()) {
        return cachedData;
    }
    try {
        const { data } = await getClient().get("/api/tenant/verify");
        // The Super Systego response shape: { success: true, data: { message, tenant, features, package } }
        const responseData = data?.data || data;
        const tenantInfo = {
            tenant: responseData.tenant,
            features: responseData.features,
            package: responseData.package,
        };
        // Update cache
        cachedData = tenantInfo;
        cachedAt = Date.now();
        console.log(`[TenantService] Verified tenant: ${tenantInfo.tenant?.company_name} | Ecommerce: ${tenantInfo.features?.haveEcommerce} | MobileApp: ${tenantInfo.features?.haveMobileApp}`);
        return tenantInfo;
    }
    catch (error) {
        // If cache exists but is stale, return stale data rather than blocking the request
        if (cachedData) {
            console.warn(`[TenantService] Failed to refresh tenant info, using stale cache: ${error.message}`);
            return cachedData;
        }
        console.error(`[TenantService] Failed to verify tenant: ${error.message}`);
        throw new Error(`Failed to verify tenant subscription: ${error.message}`);
    }
}
/**
 * Returns only the feature flags.
 * Convenience wrapper around getTenantInfo().
 */
async function getFeatures() {
    const info = await getTenantInfo();
    return info.features;
}
