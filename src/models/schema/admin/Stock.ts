import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema(
  {
      warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
      reference: { type: String, unique: true }, 
      type: { type: String, enum: ["full", "partial"], required: true },
      category_id: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      brand_id: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
      initial_file: { type: String, required: false },
      final_file: { type: String, required: false },
  },
  { timestamps: true }
);


StockSchema.pre("save", async function (next) {
  if (!this.reference) {
    const count = await mongoose.model("Stock").countDocuments();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // مثال: 20251004
    this.reference = `TRF-${date}-${count + 1}`;
  }
  next();
});

export const StockModel = mongoose.model("Stock", StockSchema);
