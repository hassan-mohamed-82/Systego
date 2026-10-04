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
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        variant: {
          type: Schema.Types.ObjectId,
          ref: "ProductPrice",
          required: false,
        },
      },
    ],

    // ═══════════════════════════════════════════════════════════
    // Shipping Address — Self + Bosta
    // ═══════════════════════════════════════════════════════════
    shippingAddress: {
      details: { type: String },
      city: { type: String },
      zone: { type: String },
      street: { type: String },
      apartmentNumber: { type: String },
      floorNumber: { type: String },
      buildingNumber: { type: String },
      uniqueIdentifier: { type: String },

      // 🆕 Bosta fields
      bostaCityId: { type: String, default: "" },
      bostaCityName: { type: String, default: "" },
      bostaZoneId: { type: String, default: "" },
      bostaZoneName: { type: String, default: "" },
      bostaDistrictId: { type: String, default: "" },
      bostaDistrictName: { type: String, default: "" },
    },

    shippingPrice: { type: Number, required: true, default: 0 },
    totalOrderPrice: { type: Number, required: true },
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: false },
    couponDiscount: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalPriceAfterDiscount: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════
    // Payment
    // ═══════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════
    // 🆕 Order Status — String مفتوح (مش enum)
    // ═══════════════════════════════════════════════════════════
    // عشان يقبل أي status جديد من Bosta أو self
    // القيم المعتادة:
    //   pending, processing, out_for_delivery, delivered,
    //   canceled, failed_to_deliver, returned, rejected, scheduled
    status: {
      type: String,
      default: "pending",
      index: true,
      // ❌ شيلنا الـ enum عشان مرونة
    },

    statusDescription: {
      type: String,
      default: "Your Order is Placed Successfully",
    },

    // 🆕 تاريخ كل تغيير في الحالة
    statusHistory: [
      {
        status: { type: String, required: true },
        description: { type: String, default: "" },
        source: {
          type: String,
          enum: ["system", "admin", "delivery_man", "bosta", "customer"],
          default: "system",
        },
        updatedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // ═══════════════════════════════════════════════════════════
    // Shipping Method (self / bosta)
    // ═══════════════════════════════════════════════════════════
    shippingMethod: {
      type: String,
      enum: ["self", "bosta", null],
      default: null,
      index: true,
    },

    shipmentType: {
      type: String,
      enum: ["self", "bosta", null],
      default: null,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════
    // Self Shipment Details
    // ═══════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════
    // 🆕 Bosta Shipment Details (cached من BostaShipment)
    // ═══════════════════════════════════════════════════════════
    bostaShipment: {
      type: Schema.Types.ObjectId,
      ref: "BostaShipment",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ═══════════════════════════════════════════════════════════
// Indexes
// ═══════════════════════════════════════════════════════════
orderSchema.index({ shippingMethod: 1, status: 1 });
orderSchema.index({ shipmentType: 1, status: 1 });
orderSchema.index({
  "selfShipment.deliveryManId": 1,
  "selfShipment.status": 1,
});
orderSchema.index({ bostaShipment: 1 });

export const OrderModel = model("Orders", orderSchema);
