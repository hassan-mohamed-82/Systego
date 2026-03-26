import { Schema, model } from 'mongoose';

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
  },
  sessionId: {
    type: String,
    required: false,
    index: true
  },
  cartItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],
  totalCartPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// نستخدم sparse: true عشان يسمح بوجود قيم null في الـ user (للضيوف) أو sessionId (للمسجلين)
cartSchema.index({ user: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

// Calculate total price before saving
cartSchema.pre('save', function (next) {
  this.totalCartPrice = this.cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

export const CartModel = model('Cart', cartSchema);