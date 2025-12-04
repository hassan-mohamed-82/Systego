import mongoose from "mongoose"

const pandelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    startdate: { type: Date, required: true },
    enddate: { type: Date, required: true },
    status:{type:Boolean,default:true},
    images: [{ type: String }],
    productsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    price: { type: Number, required: true },
  
  },
  { timestamps: true }
);

export const PandelModel = mongoose.model("Pandel", pandelSchema);

