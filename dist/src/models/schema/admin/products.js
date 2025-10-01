"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    image: { type: String },
    categoryId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category" }],
    brandId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Brand" },
    unit: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String },
    exp_ability: { type: Boolean, default: false }, // هل له صلاحية
    date_of_expiery: { type: Date },
    minimum_quantity_sale: { type: Number, default: 1 },
    low_stock: { type: Number },
    whole_price: { type: Number },
    start_quantaty: { type: Number },
    taxesId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Taxes" },
    product_has_imei: { type: Boolean, default: false },
    different_price: { type: Boolean, default: false }, // هل له أسعار مختلفة
    show_quantity: { type: Boolean, default: true },
    maximum_to_show: { type: Number },
    gallery: [{ type: String }], // صور 
}, { timestamps: true });
exports.ProductModel = mongoose_1.default.model("Product", productSchema);
