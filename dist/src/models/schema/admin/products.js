"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    ar_name: { type: String, required: true },
    ar_description: { type: String, required: true },
    image: { type: String },
    categoryId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category" }],
    brandId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Brand" },
    product_unit: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Unit" },
    sale_unit: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Unit" },
    purchase_unit: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Unit" },
    code: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String },
    exp_ability: { type: Boolean, default: false },
    // date_of_expiery: { type: Date },
    minimum_quantity_sale: { type: Number, default: 1 },
    low_stock: { type: Number },
    whole_price: { type: Number },
    start_quantaty: { type: Number },
    cost: { type: Number, },
    taxesId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Taxes" },
    product_has_imei: { type: Boolean, default: false },
    different_price: { type: Boolean, default: false },
    show_quantity: { type: Boolean, default: true },
    maximum_to_show: { type: Number },
    gallery_product: [{ type: String }],
    is_featured: { type: Boolean, default: false }
}, { timestamps: true });
exports.ProductModel = mongoose_1.default.model("Product", productSchema);
