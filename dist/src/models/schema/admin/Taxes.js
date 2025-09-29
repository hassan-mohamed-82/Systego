"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxesModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const TaxesSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
}, { timestamps: true });
exports.TaxesModel = mongoose_1.default.model("Taxes", TaxesSchema);
