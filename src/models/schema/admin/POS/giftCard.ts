import { randomUUID } from "crypto";
import mongoose, { Schema } from "mongoose";

const gifCardSchema = new Schema(
    {
        code: { type: String, required: true, unique: true },
        amount: { type: Number, required: true },
        customer_id: { type: Schema.Types.String, ref: 'Customer' },
        expiration_date: { type: Date },
        isActive: { type: Boolean, default: true },
        _id: { type: String, default: () => randomUUID() },
    },
    { _id:false, timestamps: true }
);

export const GiftCardModel = mongoose.model("GiftCard", gifCardSchema);