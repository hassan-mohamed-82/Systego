import mongoose, { Schema } from "mongoose";

const BankAccountSchema = new Schema(
  {
    name: { type: String, required: true },
    warhouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warhouse", required: true },
    image: { type: String  },
    balance: { type: Number, default: 0 },
    description: { type: String  },
    status: { type: Boolean, default: true },
    in_POS: { type: Boolean, default: false },
  },
  { timestamps: true }                                                
);

export const BankAccountModel = mongoose.model("BankAccount", BankAccountSchema);
