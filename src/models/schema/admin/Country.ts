import { Schema, model, Document } from 'mongoose';

const countrySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  ar_name: {
    type: String,
    required: true, 
  },
  isDefault: {
    type: Boolean,
    default: false, 
  }
});

export const CountryModel = model('Country', countrySchema);