import mongoose, { Schema } from "mongoose";

const DecimalSettingSchema = new Schema(
  {
    decimal_places: {
      type: Number,
      required: true,
    enum: [0, 1, 2, 3]    ,
    default: 2,
    },
  },
  { timestamps: true }
);

export const DecimalSettingModel = mongoose.model("DecimalSetting", DecimalSettingSchema);
