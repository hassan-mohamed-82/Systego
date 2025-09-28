import { Schema, model, Document } from 'mongoose';


const addressSchema = new Schema({
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
    type: String,
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


export const Address = model('Address', addressSchema);