import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        ar_name: { type: String },
        logo: { type: String },
        is_featured: { type: Boolean, default: false },
    },
    { timestamps: true }
);

brandSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "brandId",
});

export const BrandModel = mongoose.model("Brand", brandSchema);