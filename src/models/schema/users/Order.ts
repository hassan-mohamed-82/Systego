import { Schema, model, Document } from 'mongoose';
import { ORDER_TYPES } from '../../../types/constant';

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
    index: { sparse: true }
  },
  orderType: {
    type: String,
    enum: ORDER_TYPES,
    required: true,
    default: 'delivery'
  },
  warehouse: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: false
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
        required: false
      },
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
  coupon: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
    required: false
  },
  couponDiscount: {
    type: Number,
    default: 0
  },
  serviceFee: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalPriceAfterDiscount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: Schema.Types.ObjectId,
    ref: "PaymentMethod",
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ["manual", "paymob", "geidea", "fawry"],
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
  geideaSessionId: {
    type: String
  },
  geideaTransactionId: {
    type: String
  },
  geideaCallbackPayload: {
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