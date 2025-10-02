import { Schema, model, Document } from 'mongoose';

const countrySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isDefault: {
    type: Boolean,
    default: false, 
  }
});

export const CountryModel = model('Country', countrySchema);