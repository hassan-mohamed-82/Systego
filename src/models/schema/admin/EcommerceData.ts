import mongoose, { Schema, Document } from "mongoose";

export interface IHeaderData {
  logo?: string;
  title?: string;
  announcement?: string;
  phone?: string;
  email?: string;
  links?: Array<{ title: string; url: string }>;
}

export interface IFooterData {
  logo?: string;
  bio?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  copyright?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
  };
  links?: Array<{ title: string; url: string }>;
}

export interface IEcommerceData extends Document {
  name: string;
  header: IHeaderData;
  footer: IFooterData;
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
    youtube?: string;
    linkedin?: string;
  };
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const EcommerceDataSchema = new Schema<IEcommerceData>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Ecommerce Store",
    },
    header: {
      logo: { type: String, default: "" },
      title: { type: String, default: "" },
      announcement: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      links: [
        {
          title: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
    },
    footer: {
      logo: { type: String, default: "" },
      bio: { type: String, default: "" },
      description: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      copyright: { type: String, default: "" },
      social_links: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
        twitter: { type: String, default: "" },
        tiktok: { type: String, default: "" },
        youtube: { type: String, default: "" },
        linkedin: { type: String, default: "" },
      },
      links: [
        {
          title: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
    },
    // Backward compatibility flat fields
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true, default: "Store Manager" },
    bio: { type: String, trim: true },
    address: { type: String, trim: true },
    image: { type: String, default: null },
    social_links: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const EcommerceDataModel = mongoose.model<IEcommerceData>(
  "EcommerceData",
  EcommerceDataSchema
);

