import { Schema, model, Document } from 'mongoose';

const citySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  country: {
    type: Schema.Types.ObjectId, 
    ref: 'Country',
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  }
});

export const City = model('City', citySchema);