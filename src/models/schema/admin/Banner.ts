import mongoose, { Schema } from "mongoose";

const BannerSchema = new Schema(
  {
    name: { type: String, required: true },
    images: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BannerModel = mongoose.model("Banner", BannerSchema);
