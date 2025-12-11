import mongoose, { Schema } from "mongoose";

const CashierShiftSchema = new Schema({
  start_time: { type: Date },
  end_time:   { type: Date },
  status:     { type: String, enum: ['open', 'closed'], default: 'open' },

  total_sale_amount:  { type: Number, default: 0 }, // إجمالي مبيعات الكاش
  total_expenses:     { type: Number, default: 0 },
  net_cash_in_drawer: { type: Number, default: 0 },

  cashierman_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

export const CashierShift = mongoose.model("CashierShift", CashierShiftSchema);