"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueCategoryModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const RevenueCategorySchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    ar_name: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
exports.RevenueCategoryModel = mongoose_1.default.model("RevenueCategory", RevenueCategorySchema);
