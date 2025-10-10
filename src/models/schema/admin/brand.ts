import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        logo: { type: String },
    },
    { timestamps: true }
);

brandSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "brandId",
});

export const BrandModel = mongoose.model("Brand", brandSchema);