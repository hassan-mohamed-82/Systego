"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PandelModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const pandelSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    startdate: { type: Date, required: true },
    enddate: { type: Date, required: true },
    status: { type: Boolean, default: true },
    images: [{ type: String }],
    products: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product" }],
}, { timestamps: true });
exports.PandelModel = mongoose_1.default.model("Pandel", pandelSchema);
