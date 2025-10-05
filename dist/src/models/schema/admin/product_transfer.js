"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product_transferModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_transferSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product", required: true },
    WarehouseId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true },
});
exports.Product_transferModel = mongoose_1.default.model("Product_transfer", Product_transferSchema);
