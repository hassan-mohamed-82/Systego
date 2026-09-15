import mongoose, { Schema, Document } from "mongoose";

export interface IHeaderData {
  logo?: string;
  title?: string;
  announcement?: string;
  links?: string[];
}

export interface IFooterData {
  logo?: string;
  bio?: string;
  copyright?: string;
}

export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}

export interface IEcommerceData extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: "active" | "inactive";
  social_links?: ISocialLinks;
  header: IHeaderData;
  footer: IFooterData;
  createdAt: Date;
  updatedAt: Date;
}

const EcommerceDataSchema = new Schema<IEcommerceData>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Main Store",
    },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    social_links: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    header: {
      logo: { type: String, default: "" },
      title: { type: String, default: "" },
      announcement: { type: String, default: "" },
      links: [{ type: String, trim: true }],
    },
    footer: {
      logo: { type: String, default: "" },
      bio: { type: String, default: "" },
      copyright: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const EcommerceDataModel = mongoose.model<IEcommerceData>(
  "EcommerceData",
  EcommerceDataSchema
);
