import mongoose, { Schema } from "mongoose";

const ActionSchema = new Schema(
  {
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true }, 
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const ActionModel = mongoose.model("Action", ActionSchema);
