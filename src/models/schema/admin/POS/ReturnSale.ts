import mongoose, { Schema } from "mongoose";

const ReturnSaleSchema = new Schema({
    reference: {
      type: String,
      maxlength: 100,
      trim: true,
      default: function () {
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `RETURNS-${datePart}-${randomPart}`;
      },
    },
    sale_id: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    return_date: { type: Date, default: Date.now },
    return_reason: { type: String, trim: true },

})

export const ReturnSaleModel = mongoose.model("ReturnSale", ReturnSaleSchema);
