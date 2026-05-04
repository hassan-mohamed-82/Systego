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
    // ✅ الكاشير متاح في النظام
    status: { type: Boolean, default: true },
    // ✅ false = متاح / true = مشغول في شيفت
    cashier_active: { type: Boolean, default: false },
    bankAccounts: [
        { type: mongoose_1.default.Schema.Types.ObjectId, ref: "BankAccount" },
    ],
    printer_type: { type: String, enum: ["USB", "NETWORK"] },
    printer_IP: {
        type: String,
        required: function () {
            return this.printer_type === "NETWORK";
        },
        match: [/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"],
    },
    printer_port: {
        type: Number,
        required: function () {
            return this.printer_type === "NETWORK";
        },
    },
    Printer_name: {
        type: String,
        required: function () {
            return this.printer_type === "NETWORK";
        },
    },
}, { timestamps: true });
// Virtual
CashierSchema.virtual("warehouseUsers", {
    ref: "User",
    localField: "warehouse_id",
    foreignField: "warehouseId",
});
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });
exports.CashierModel = mongoose_1.default.model("Cashier", CashierSchema);
