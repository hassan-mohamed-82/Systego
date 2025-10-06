"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectReasonModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const selectReasonSchema = new mongoose_1.default.Schema({
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
exports.SelectReasonModel = mongoose_1.default.model("SelectReason", selectReasonSchema);
