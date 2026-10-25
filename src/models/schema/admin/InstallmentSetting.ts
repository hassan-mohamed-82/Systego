import mongoose, { Schema } from "mongoose";

/**
 * إعدادات التقسيط (وثيقة واحدة لكل تينانت).
 * الأدمن هو اللي بيحدد الفايدة، والحد الأقصى لعدد الأقساط، وأقل مقدم مسموح.
 */
const InstallmentSettingSchema = new Schema(
  {
    key: { type: String, unique: true, default: "default" },

    enabled: { type: Boolean, default: true },

    /**
     * percentage: نسبة من المبلغ الممول (مثال: 10 = 10%)
     * fixed: مبلغ ثابت يتضاف على كل قسط (مثال: 50 = 50 جنيه لكل قسط)
     */
    interest_type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    interest_value: { type: Number, default: 0, min: 0 },

    max_installments: { type: Number, default: 12, min: 1, max: 60 },
    min_down_payment_percent: { type: Number, default: 0, min: 0, max: 100 },

    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const InstallmentSettingModel = mongoose.model(
  "InstallmentSetting",
  InstallmentSettingSchema,
);
