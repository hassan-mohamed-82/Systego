"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTypeModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const constant_1 = require("../../../types/constant");
const orderTypeSchema = new mongoose_1.default.Schema({
    type: {
        type: String,
        enum: constant_1.ORDER_TYPES,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.OrderTypeModel = mongoose_1.default.model("OrderType", orderTypeSchema);
