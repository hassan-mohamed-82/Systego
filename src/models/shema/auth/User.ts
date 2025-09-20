import { model, Schema, Types } from "mongoose";
import mongoose from "mongoose";
 const UserSchema = new Schema(
  {
    
    name: { type: String, },
    email: { type: String, unique: true },
    password: { type: String},
    BaseImage64: { type: String},
    fcmtoken: { type: String },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },   

  },
  { timestamps: true, }
);

export const UserModel = mongoose.model('User', UserSchema);

