"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BookingSchema = new mongoose_1.default.Schema({
    number_of_days: { type: Number, required: true },
    deposit: { type: Number, required: true },
    CustmerId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Custmer" }],
    WarehouseId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse" }],
    ProductId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "product" }],
    CategoryId: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category" }],
    option_id: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "ProductPriceOption" }],
    status: { type: String, enum: ["pending", "pay", "failer"], default: "pending" },
}, { timestamps: true });
exports.BookingModel = mongoose_1.default.model("Booking", BookingSchema);
