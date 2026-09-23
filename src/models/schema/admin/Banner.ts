import mongoose, { Schema } from "mongoose";
import { BANNER_PAGES } from "../../../types/constant";

const BannerSchema = new Schema(
  {
    name: [{ type: String, enum: BANNER_PAGES }],
    title: { type: String, required: false },
    description: { type: String, required: false },
    images: [{ type: String, required: true }],
    link: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BannerModel = mongoose.model("Banner", BannerSchema);
