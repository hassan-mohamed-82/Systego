import mongoose, { Schema, Document } from "mongoose";

export interface IEcommerceUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  bio?: string;
  address?: string;
  image?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    tiktok?: string;
  };
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const EcommerceUserSchema = new Schema<IEcommerceUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      default: "Store Manager",
    },
    bio: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    social_links: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const EcommerceUserModel = mongoose.model<IEcommerceUser>(
  "EcommerceUser",
  EcommerceUserSchema
);
