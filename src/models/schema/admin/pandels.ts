import mongoose from "mongoose"

const pandelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    startdate: { type: Date, required: true },
    enddate: { type: Date, required: true },
    status:{type:Boolean,default:true},
    images: [{ type: String }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    
  },
  { timestamps: true }
);

export const PandelModel = mongoose.model("Pandel", pandelSchema);

