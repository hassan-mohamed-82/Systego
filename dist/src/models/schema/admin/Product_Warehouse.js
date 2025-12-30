"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product_WarehouseModel = void 0;
// models/Product_Warehouse.ts
const mongoose_1 = __importDefault(require("mongoose"));
const Product_WarehouseSchema = new mongoose_1.default.Schema({
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    // ✅ إضافة productPriceId لتتبع الـ variations (اختياري - لو null يعني المنتج الأساسي)
    productPriceId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "ProductPrice",
        default: null,
    },
    warehouseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    quantity: { type: Number, required: true, default: 0 },
    low_stock: { type: Number, default: 0 },
}, { timestamps: true });
// ✅ تحديث الـ unique index ليشمل productPriceId
Product_WarehouseSchema.index({ productId: 1, productPriceId: 1, warehouseId: 1 }, { unique: true });
exports.Product_WarehouseModel = mongoose_1.default.model("Product_Warehouse", Product_WarehouseSchema);
