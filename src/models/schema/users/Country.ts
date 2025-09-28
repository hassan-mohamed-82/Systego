import { Schema, model, Document } from 'mongoose';

const countrySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'Egypt'
  }
});

export const Country = model('Country', countrySchema);