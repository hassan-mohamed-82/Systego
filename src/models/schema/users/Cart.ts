import { Schema, model } from 'mongoose';

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
    index: { unique: true, sparse: true }
  },
  sessionId: {
    type: String,
    required: false,
    index: { unique: true, sparse: true }
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
      },
      variant: {
        type: Schema.Types.ObjectId,
        ref: 'ProductPrice',
        required: false
      }
    }
  ],
  totalCartPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
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
  }
}, {
  timestamps: true
});

// Calculate total price before saving
cartSchema.pre('save', function (next) {
  if (this.cartItems) {
    this.totalCartPrice = this.cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Final total calculation
    this.totalPriceAfterDiscount = (this.totalCartPrice + this.serviceFee + this.taxAmount) - this.couponDiscount;
    if (this.totalPriceAfterDiscount < 0) this.totalPriceAfterDiscount = 0;
  }
  next();
});

export const CartModel = model('Cart', cartSchema);