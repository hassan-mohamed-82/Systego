// models/schema/admin/POS/CashierShift.ts
import mongoose, { Schema } from "mongoose";

const CashierShiftSchema = new Schema(
  {
    start_time: { type: Date },
    end_time:   { type: Date },
    status:     { type: String, enum: ["open", "closed"], default: "open" },

    // أرقام الشيفت
    total_sale_amount:  { type: Number, default: 0 },
    total_expenses:     { type: Number, default: 0 },
    net_cash_in_drawer: { type: Number, default: 0 },

    // اليوزر اللي شغّال على السيستم (من الـ JWT)
    cashierman_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // الكاشير اللي متحدد من شاشة الاختيار (CashierModel)
    cashier_id: {
      type: Schema.Types.ObjectId,
      ref: "Cashier",
      required: true,
    },
  },
  { timestamps: true }
);

export const CashierShift = mongoose.model("CashierShift", CashierShiftSchema);
