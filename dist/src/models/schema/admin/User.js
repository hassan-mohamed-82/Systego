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
exports.UserModel = void 0;
// src/models/schema/admin/User.ts
const mongoose_1 = __importStar(require("mongoose"));
const constant_1 = require("../../../types/constant");
// كل أكشن هيبقى Subdocument بـ _id + action
const PermissionActionSchema = new mongoose_1.Schema({
    action: {
        type: String,
        enum: constant_1.ACTION_NAMES, // ["view","add","edit","delete"]
        required: true,
    },
}, { _id: true } // هنا بيولد _id لكل أكشن
);
const PermissionSchema = new mongoose_1.Schema({
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
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password_hash: { type: String, required: true },
    company_name: { type: String },
    phone: { type: String },
    role: {
        type: String,
        enum: ["superadmin", "admin"],
        default: "admin",
    },
    permissions: {
        type: [PermissionSchema],
        default: [],
    },
    status: {
        type: String,
        default: "active",
        enum: ["active", "inactive"],
    },
    image_url: { type: String },
    address: { type: String },
    vat_number: { type: String },
    state: { type: String },
    postal_code: { type: String },
    warehouse_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse" },
}, { timestamps: true });
exports.UserModel = mongoose_1.default.model("User", UserSchema);
