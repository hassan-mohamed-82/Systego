import { Schema, model, Document } from 'mongoose';

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  cartItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: Number,
      price: Number,
    },
  ],
  shippingAddress: {
    // بدل ما يكون Ref فقط، خزن التفاصيل المهمة
    details: { type: String },
    city: { type: String },
    zone: { type: String }
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  totalOrderPrice: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: Schema.Types.ObjectId,
    ref: "PaymentMethod",
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ["manual", "paymob"],
    default: "manual"
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "paid", "failed"],
    default: "unpaid"
  },
  paymobOrderId: {
    type: String
  },
  paymobTransactionId: {
    type: String
  },
  paymobIframeUrl: {
    type: String
  },
  paymobCallbackPayload: {
    type: Schema.Types.Mixed
  },
  proofImage: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'rejected', 'approved'],
    default: 'pending'
  },
}, {
  timestamps: true
});

export const OrderModel = model('Order', orderSchema);