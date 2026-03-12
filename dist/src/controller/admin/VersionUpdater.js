"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBackend = exports.syncFrontend = exports.syncAll = exports.checkForChanges = void 0;
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const versionUpdater = __importStar(require("../../utils/versionUpdater"));
// =========================
// Check for Changes (dry run)
// =========================
const checkForChanges = async (req, res, next) => {
    const { clientName } = req.body;
    if (!clientName || typeof clientName !== "string") {
        throw new Errors_1.BadRequest("clientName is required");
    }
    const result = await versionUpdater.checkForChanges(clientName.trim());
    (0, response_1.SuccessResponse)(res, {
        message: "Version check completed",
        result,
    });
};
exports.checkForChanges = checkForChanges;
// =========================
// Sync All (frontend + backend)
// =========================
const syncAll = async (req, res, next) => {
    const { clientName } = req.body;
    if (!clientName || typeof clientName !== "string") {
        throw new Errors_1.BadRequest("clientName is required");
    }
    const result = await versionUpdater.syncAll(clientName.trim());
    (0, response_1.SuccessResponse)(res, {
        message: "Full sync completed",
        result,
    });
};
exports.syncAll = syncAll;
// =========================
// Sync Frontend Only
// =========================
const syncFrontend = async (req, res, next) => {
    const { clientName } = req.body;
    if (!clientName || typeof clientName !== "string") {
        throw new Errors_1.BadRequest("clientName is required");
    }
    const result = await versionUpdater.syncFrontend(clientName.trim());
    (0, response_1.SuccessResponse)(res, {
        message: "Frontend sync completed",
        result,
    });
};
exports.syncFrontend = syncFrontend;
// =========================
// Sync Backend Only
// =========================
const syncBackend = async (req, res, next) => {
    const { clientName } = req.body;
    if (!clientName || typeof clientName !== "string") {
        throw new Errors_1.BadRequest("clientName is required");
    }
    const result = await versionUpdater.syncBackend(clientName.trim());
    (0, response_1.SuccessResponse)(res, {
        message: "Backend sync completed",
        result,
    });
};
exports.syncBackend = syncBackend;
