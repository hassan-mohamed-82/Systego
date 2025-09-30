"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPriceOptionModel = exports.ProductPriceModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const productPriceSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Number, required: true },
    code: { type: String, required: true, unique: true },
    gallery: [{ type: String }], // صور إضافية
}, { timestamps: true });
exports.ProductPriceModel = mongoose_1.default.model("ProductPrice", productPriceSchema);
const productPriceOptionSchema = new mongoose_1.default.Schema({
    product_price_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "ProductPrice", required: true },
    option_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Option", required: true },
}, { timestamps: true });
exports.ProductPriceOptionModel = mongoose_1.default.model("ProductPriceOption", productPriceOptionSchema);
