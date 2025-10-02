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
  }
});

export const CityModels = model('City', citySchema);