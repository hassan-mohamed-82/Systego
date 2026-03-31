import { Schema, model, Document } from 'mongoose';

export interface IFawry extends Document {
  payment_method_id: Schema.Types.ObjectId;
  merchantCode: string;
  secureKey: string;
  isActive: boolean;
  sandboxMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fawrySchema = new Schema<IFawry>({
  payment_method_id: {
    type: Schema.Types.ObjectId,
    ref: "PaymentMethod",
    required: true
  },
  merchantCode: { 
    type: String, 
    required: true,
    trim: true
  },
  secureKey: { 
    type: String, 
    required: true, 
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },
  sandboxMode: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

export const FawryModel = model<IFawry>('Fawry', fawrySchema);