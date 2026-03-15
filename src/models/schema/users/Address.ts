import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'UserStore',
    required: true
  },
  country: {
    type: Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  city: {
    type: Schema.Types.ObjectId,
    ref: 'City',
    required: true
  },
  zone: {
    type: Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  street: {
    type: String,
    required: true
  },
  buildingNumber: {
    type: String,
    required: true
  },
  floorNumber: {
    type: String
  },
  apartmentNumber: {
    type: String
  },
  uniqueIdentifier: {
    type: String
  }
}, {
  timestamps: true
});

export const AddressModel = model('Address', addressSchema);