import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },

    company_name: { type: String },
    phone: { type: String },
    role: { type: String,enum: ["superadmin", "admin"] ,default:"admin"}, 
    
    possitionId: { type: Schema.Types.ObjectId, ref: "Position", required: true },
    status: { type: String, default: "active", enum: ["active", "inactive"] },

    image_url: { type: String },
    address: { type: String },
    vat_number: { type: String },
    state: { type: String },
    postal_code: { type: String },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);
