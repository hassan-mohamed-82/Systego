import mongoose from "mongoose";


const TransferSchema = new mongoose.Schema({

  reference: {
      type: String,
      trim: true,
      unique: true,
      maxlength: 8,
      default: function () {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const datePart = `${month}${day}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${datePart}${randomPart}`;
      },
  },
  
  date: { type: Date, default: Date.now },
  fromWarehouseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Warehouse", 
    required: true 
  },
  toWarehouseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Warehouse", 
    required: true 
  },

  // مصفوفة المنتجات اللي بتتحول
  products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      }
    }
  ],

  // مصفوفة المنتجات اللي بتترفض
  rejected_products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      reason: { 
        type: String, 
        required: true, 
      },
    }
  ],

  // مصفوفة المنتجات اللي بتترفض
  approved_products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      }, 
    }
  ],

  status: { 
    type: String, 
    enum: ["pending", "done", "rejected"], 
    default: "pending" 
  },
 reason: { type: String, required: true },

});


TransferSchema.pre("save", async function (next) {
  if (!this.reference) {
    const count = await mongoose.model("Transfer").countDocuments();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // مثال: 20251029
    this.reference = `TRF-${date}-${count + 1}`;
  }
  next();
});

export const TransferModel = mongoose.model("Transfer", TransferSchema);
