import mongoose from "mongoose";

const TransferSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  reference: { type: String, unique: true },
  fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ["pending", "received"], default: "pending" },
});

TransferSchema.pre("save", async function (next) {
  if (!this.reference) {
    const count = await mongoose.model("Transfer").countDocuments();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // مثال: 20251004
    this.reference = `TRF-${date}-${count + 1}`;
  }
  next();
});

export const TransferModel = mongoose.model("Transfer", TransferSchema);




const Product_transferSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  WarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true },
});
export const Product_transferModel = mongoose.model("Product_transfer", Product_transferSchema);
