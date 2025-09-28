import { Schema, model } from 'mongoose';

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true 
  },
  cartItems: [
    {
      product: {
        type: Schema.Types.ObjectId, 
        ref: 'Products',
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

// Calculate total price before saving
cartSchema.pre('save', function(next) {
  this.totalCartPrice = this.cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

export const Cart = model('Cart', cartSchema);