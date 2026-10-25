import mongoose, { Schema } from "mongoose";

/**
 * خطة تقسيط مرتبطة بفاتورة POS أو أوردر إيكومرس.
 * نفس الموديل بيتستخدم في الاتنين عشان التقارير والتحصيل يبقوا موحّدين.
 */
const InstallmentPlanSchema = new Schema(
  {
    plan_number: { type: String, unique: true, index: true },

    source: {
      type: String,
      enum: ["pos", "ecommerce"],
      required: true,
      index: true,
    },

    // POS
    sale_id: { type: Schema.Types.String, ref: "Sale", index: true },
    // Ecommerce
    order_id: { type: Schema.Types.ObjectId, ref: "Order", index: true },

    customer_id: {
      type: Schema.Types.String,
      ref: "Customer",
      required: true,
      index: true,
    },
    warehouse_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    order_reference: { type: String, default: "" },

    // 💰 الأرقام
    order_total: { type: Number, required: true, min: 0 },
    down_payment: { type: Number, default: 0, min: 0 },
    financed_amount: { type: Number, required: true, min: 0 },

    interest_type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    interest_value: { type: Number, default: 0, min: 0 },
    interest_amount: { type: Number, default: 0, min: 0 },

    total_payable: { type: Number, required: true, min: 0 },
    installments_count: { type: Number, required: true, min: 1 },

    // paid_amount = إجمالي اللي اتحصّل من الأقساط (من غير المقدم)
    paid_amount: { type: Number, default: 0, min: 0 },
    remaining_amount: { type: Number, required: true, min: 0 },

    start_date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },

    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

InstallmentPlanSchema.index({ status: 1, remaining_amount: 1 });
InstallmentPlanSchema.index({ createdAt: -1 });

const InstallmentItemSchema = new Schema(
  {
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "InstallmentPlan",
      required: true,
      index: true,
    },
    sale_id: { type: Schema.Types.String, ref: "Sale" },
    order_id: { type: Schema.Types.ObjectId, ref: "Order" },
    customer_id: { type: Schema.Types.String, ref: "Customer", index: true },
    warehouse_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      index: true,
    },

    sequence: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    due_date: { type: Date, required: true, index: true },

    paid_amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "cancelled"],
      default: "pending",
      index: true,
    },
    paid_at: { type: Date, default: null },
    paid_by: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // سجل الدفعات (يدعم الدفع الجزئي)
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        account_id: { type: Schema.Types.ObjectId, ref: "BankAccount" },
        paid_at: { type: Date, default: Date.now },
        paid_by: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

InstallmentItemSchema.index({ plan_id: 1, sequence: 1 }, { unique: true });
InstallmentItemSchema.index({ status: 1, due_date: 1 });

export const InstallmentPlanModel = mongoose.model(
  "InstallmentPlan",
  InstallmentPlanSchema,
);
export const InstallmentItemModel = mongoose.model(
  "InstallmentItem",
  InstallmentItemSchema,
);
