import mongoose, { Schema } from "mongoose";

const RoleSchema = new Schema(
  {
    possitionId: { type: Schema.Types.ObjectId, ref: "Position", required: true },
    name: { type: String, required: true, unique: true }, // زي "UserManagement" أو "Inventory"
  },
  { timestamps: true }
);

export const RoleModel = mongoose.model("Role", RoleSchema);
