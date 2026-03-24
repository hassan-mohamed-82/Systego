import mongoose, { Schema } from "mongoose";
import { BANNER_PAGES } from "../../../types/constant";

const BannerSchema = new Schema(
  {
    name: { type: String, enum: [...BANNER_PAGES], required: true },
    images: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BannerModel = mongoose.model("Banner", BannerSchema);
