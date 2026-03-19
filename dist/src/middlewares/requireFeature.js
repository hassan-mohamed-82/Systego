"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = void 0;
const tenantService_1 = require("../utils/tenantService");
/**
 * Middleware factory that gates routes behind a specific feature flag
 * from the tenant's subscription package.
 *
 * Usage:
 *   router.use(requireFeature('haveEcommerce'));  // blocks all routes in this router
 *   router.get('/orders', requireFeature('haveEcommerce'), getOrders);  // blocks one route
 *
 * If the feature is not enabled in the plan, responds with 403 Forbidden.
 * If the tenant service is not configured (env vars missing), allows access
 * with a warning log — this prevents blocking in development environments.
 */
const requireFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const features = await (0, tenantService_1.getFeatures)();
            if (!features[featureName]) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 403,
                        message: `This feature is not included in your subscription plan.`,
                        feature: featureName,
                    }
                });
                return;
            }
            // Feature is enabled — proceed
            next();
        }
        catch (error) {
            // If Super Systego is not configured or unreachable,
            // allow access with a warning (don't block in dev/first setup)
            if (error.message?.includes('not configured')) {
                console.warn(`[requireFeature] Tenant verification not configured — allowing access. Set SUPER_SYSTEGO_URL and SUPER_SYSTEGO_API_KEY in .env`);
                return next();
            }
            console.error(`[requireFeature] Error checking feature ${featureName}: ${error.message}`);
            res.status(503).json({
                success: false,
                error: {
                    code: 503,
                    message: 'Unable to verify subscription. Please try again later.',
                }
            });
        }
    };
};
exports.requireFeature = requireFeature;
