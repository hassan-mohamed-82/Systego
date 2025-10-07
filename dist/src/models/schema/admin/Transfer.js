"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const TransferSchema = new mongoose_1.default.Schema({
    date: { type: Date, default: Date.now },
    reference: { type: String, unique: true },
    fromWarehouseId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    toWarehouseId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["pending", "received"], default: "pending" },
});
TransferSchema.pre("save", async function (next) {
    if (!this.reference) {
        const count = await mongoose_1.default.model("Transfer").countDocuments();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // مثال: 20251004
        this.reference = `TRF-${date}-${count + 1}`;
    }
    next();
});
exports.TransferModel = mongoose_1.default.model("Transfer", TransferSchema);
