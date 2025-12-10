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
    warehouse_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    status: { type: Boolean, default: true },
}, { timestamps: true });
// 👇 Virtual: يجيب كل الـ Users اللي عندهم نفس warehouse_id
CashierSchema.virtual("users", {
    ref: "User", // اسم الموديل
    localField: "warehouse_id", // في Cashier
    foreignField: "warehouseId", // في User
    justOne: false, // لو عايزهم array
});
// لازم نفعّل الـ virtuals في toJSON / toObject
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });
exports.CashierModel = mongoose_1.default.model("Cashier", CashierSchema);
