"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashierModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CashierSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    ar_name: { type: String, required: true },
    warehouse_id: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    status: { type: Boolean, default: true },
    cashier_active: { type: Boolean, default: false },
    bankAccounts: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "BankAccount" }],
}, { timestamps: true });
// ✅ Virtual للـ users بس - بإسم مختلف
CashierSchema.virtual("warehouseUsers", {
    ref: "User",
    localField: "warehouse_id",
    foreignField: "warehouseId",
    justOne: false,
});
// ❌ امسح الـ virtual بتاع bankAccounts لأنه موجود كـ field
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });
exports.CashierModel = mongoose_1.default.model("Cashier", CashierSchema);
