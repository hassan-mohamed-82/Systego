"use strict";
// src/models/schema/admin/Role.ts
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
exports.RoleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const constant_1 = require("../../../types/constant");
// Schema للـ Action داخل كل Permission
const PermissionActionSchema = new mongoose_1.Schema({
    action: {
        type: String,
        enum: constant_1.ACTION_NAMES,
        required: true,
    },
}, { _id: true });
// Schema للـ Permission (module + actions)
const RolePermissionSchema = new mongoose_1.Schema({
    module: {
        type: String,
        enum: constant_1.MODULES,
        required: true,
    },
    actions: {
        type: [PermissionActionSchema],
        default: [],
    },
}, { _id: false });
// Schema الرئيسي للـ Role
const RoleSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    permissions: {
        type: [RolePermissionSchema],
        default: [],
    },
}, { timestamps: true });
exports.RoleModel = mongoose_1.default.model("Role", RoleSchema);
