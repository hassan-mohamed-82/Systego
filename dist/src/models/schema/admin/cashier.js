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
    printer_type: { type: String, enum: ["USB", "NETWORK"] },
    // إجبار إدخال البيانات لو النوع NETWORK
    printer_IP: {
        type: String,
        required: function () { return this.printer_type === "NETWORK"; }
    },
    printer_port: {
        type: Number,
        required: function () { return this.printer_type === "NETWORK"; }
    },
    Printer_name: {
        type: String,
        required: function () { return this.printer_type === "NETWORK"; }
    },
}, { timestamps: true });
// ✅ Virtual للـ users
CashierSchema.virtual("warehouseUsers", {
    ref: "User",
    localField: "warehouse_id",
    foreignField: "warehouseId",
    justOne: false,
});
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });
exports.CashierModel = mongoose_1.default.model("Cashier", CashierSchema);
