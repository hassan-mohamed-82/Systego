"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTenantInfoController = exports.getTenantInfoController = void 0;
const response_1 = require("../../utils/response");
const tenantService_1 = require("../../utils/tenantService");
const catchAsync_1 = require("../../utils/catchAsync");
exports.getTenantInfoController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    try {
        const tenantInfo = await (0, tenantService_1.getTenantInfo)();
        return (0, response_1.SuccessResponse)(res, {
            message: "Tenant info retrieved successfully",
            ...tenantInfo,
        }, 200);
    }
    catch (error) {
        // If tenant service is not configured, return a default "all features enabled" response
        if (error.message?.includes("not configured")) {
            return (0, response_1.SuccessResponse)(res, {
                message: "Tenant verification not configured — all features enabled by default",
                tenant: null,
                features: { haveEcommerce: true, haveMobileApp: true },
                package: null,
            }, 200);
        }
        throw error;
    }
});
exports.refreshTenantInfoController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    (0, tenantService_1.clearCache)();
    const tenantInfo = await (0, tenantService_1.getTenantInfo)();
    return (0, response_1.SuccessResponse)(res, {
        message: "Tenant info refreshed successfully",
        ...tenantInfo,
    }, 200);
});
