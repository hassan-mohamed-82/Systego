import mongoose, { Document, Schema, Model } from "mongoose";

// واجهة Variation
export interface IVariation extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// واجهة Option
export interface IOption extends Document {
  variationId: mongoose.Types.ObjectId;
  name: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}
  const VariationSchema: Schema<IVariation> = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const OptionSchema: Schema<IOption> = new Schema(
  {
    variationId: { type: Schema.Types.ObjectId, ref: "Variation", required: true },
    name: { type: String, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const VariationModel: Model<IVariation> = mongoose.model<IVariation>("Variation", VariationSchema);

export const OptionModel: Model<IOption> = mongoose.model<IOption>("Option", OptionSchema);
