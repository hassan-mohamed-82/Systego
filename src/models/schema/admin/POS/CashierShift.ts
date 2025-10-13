import mongoose, { Schema } from "mongoose";

const CashierShiftSchema = new Schema({
    start_time: {type: Date},
    end_time: {type: Date},
    total_sale_amount: { type: Number, default: 0 },
    cashier_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }
})

export const CashierShift = mongoose.model("CashierShift", CashierShiftSchema);