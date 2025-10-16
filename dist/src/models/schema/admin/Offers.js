"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const OffersSchema = new mongoose_1.default.Schema({
    categoryId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category" }],
    productId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product" }],
    discountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Discount" },
}, { timestamps: true });
exports.OffersModel = mongoose_1.default.model("Offers", OffersSchema);
