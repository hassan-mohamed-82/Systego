import { Schema, model, Document } from 'mongoose';

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId, 
    ref: 'platform_user',
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
     totalPrice: {
      type: Number,
    },
    shippingAddress: {
       type: Schema.Types.ObjectId, 
       ref: 'Address'
    },
    paymentMethod: {
    type: Schema.Types.ObjectId, 
    ref: "PaymentMethod",
    required: true
    },
    proofImage: {
     type: String,
    required: true
    },
  status: {
    type: String,
    enum: ['pending', 'rejected', 'approved'],
    default: 'pending'
  },
}, {
  timestamps: true
});

export const Order = model('Order', orderSchema);