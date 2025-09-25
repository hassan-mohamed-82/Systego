import mongoose, { Schema } from "mongoose";

const ProductsSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    icon: { type: String },
    code: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true },
    brand_id: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    unit: {
      type: String,
      enum: ["piece", "kilogram", "liter", "meter"],
      required: true,
    },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    stock_worth: { type: Number, required: true },
    exp_date: { type: Date, required: true },
    notify_near_expiry: { type: Boolean, required: true },


  },
  { timestamps: true }
);

export const ProductsModel = mongoose.model("Products", ProductsSchema);
