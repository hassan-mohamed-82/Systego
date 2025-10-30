import { Schema, model, Document } from 'mongoose';

const citySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ar_name: {
    type: String,
    required: true, 
  },
  country: {
    type: Schema.Types.ObjectId, 
    ref: 'Country',
    required: true
  },
  shipingCost: {
    type: Number,
    default: 0
  }
});

export const CityModels = model('City', citySchema);