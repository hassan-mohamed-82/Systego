// src/models/schema/users/Order.ts
import { Schema, model } from "mongoose";
import { ORDER_TYPES } from "../../../types/constant";

const orderSchema = new Schema(
  {
    reference: {
      type: String,
      trim: true,
      unique: true,
      maxlength: 8,
      default: function () {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const datePart = `${month}${day}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${datePart}${randomPart}`;
      },
    },

    user: {
      type: Schema.Types.String,
      ref: "Customer",
      required: false,
      index: { sparse: true },
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: true,
      default: "delivery",
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: false,
    },
    cartItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        price: Number,
        variant: {
          type: Schema.Types.ObjectId,
          ref: "ProductPrice",
          required: false,
        },
      },
    ],
    shippingAddress: {
      details: { type: String },
      city: { type: String },
      zone: { type: String },
      street: { type: String },
      apartmentNumber: { type: Number },
      floorNumber: { type: Number },
      buildingNumber: { type: Number },
      uniqueIdentifier: { type: String },
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalOrderPrice: {
      type: Number,
      required: true,
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalPriceAfterDiscount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ["manual", "paymob", "geidea", "fawry"],
      default: "manual",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed"],
      default: "unpaid",
    },
    paymobOrderId: { type: String },
    paymobTransactionId: { type: String },
    paymobIframeUrl: { type: String },
    paymobCallbackPayload: { type: Schema.Types.Mixed },
    geideaSessionId: { type: String },
    geideaTransactionId: { type: String },
    geideaCallbackPayload: { type: Schema.Types.Mixed },
    proofImage: { type: String },
    status: {
      type: String,
      enum: [
        "pending",
        "rejected",
        "confirmed",
        "processing",
        "out_for_delivery",
        "delivered",
        "returned",
        "failed_to_deliver",
        "canceled",
        "scheduled",
      ],
      default: "pending",
    },
    statusDescription: {
      type: String,
      default: "Your Order is Placed Successfully",
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ NEW: Self Shipping Assignment
    // ═══════════════════════════════════════════════════════════
    // اختيار الكاستومر من الموقع (يجي من الـ request)
    shippingMethod: {
      type: String,
      enum: ["self", "bosta", null],
      default: null,
      index: true,
    },

    // الحالة الفعلية بعد تدخل الأدمن
    shipmentType: {
      type: String,
      enum: ["self", "bosta", null],
      default: null,
      index: true,
    },

    selfShipment: {
      deliveryManId: {
        type: Schema.Types.ObjectId,
        ref: "DeliveryMan",
        default: null,
        index: true,
      },
      warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null,
      },
      status: {
        type: String,
        enum: [
          "unassigned",
          "assigned",
          "picked_up",
          "out_for_delivery",
          "delivered",
          "failed",
        ],
        default: "unassigned",
      },
      assignedAt: { type: Date, default: null },
      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      assignmentType: {
        type: String,
        enum: ["auto", "manual", null],
        default: null,
      },
      pickedUpAt: { type: Date, default: null },
      outForDeliveryAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      failureReason: { type: String, default: "" },
      deliveryNotes: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  },
);

// ✅ فهارس للبحث السريع
orderSchema.index({ shippingMethod: 1, status: 1 });
orderSchema.index({ shipmentType: 1, status: 1 });
orderSchema.index({
  "selfShipment.deliveryManId": 1,
  "selfShipment.status": 1,
});

export const OrderModel = model("Orders", orderSchema);
