"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const brandSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    logo: { type: String },
}, { timestamps: true });
brandSchema.virtual("products", {
    ref: "Product",
    localField: "_id",
    foreignField: "brandId",
});
exports.BrandModel = mongoose_1.default.model("Brand", brandSchema);
