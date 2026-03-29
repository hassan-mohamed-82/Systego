import { Schema, model, Document } from 'mongoose';

// واجهة (Interface) عشان الـ TypeScript ميزعلش مننا
export interface IGeidea extends Document {
  payment_method_id: Schema.Types.ObjectId;
  publicKey: string;
  apiPassword: string;
  merchantId: string;
  webhookSecret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const geideaSchema = new Schema<IGeidea>({
  payment_method_id: {
    type: Schema.Types.ObjectId,
    ref: "PaymentMethod", // ربطناه بطرق الدفع زي ما عملنا في Paymob
    required: true
  },
  publicKey: { 
    type: String, 
    required: true,
    trim: true
  },
  apiPassword: { 
    type: String, 
    required: true,
    trim: true
  },
  merchantId: { 
    type: String, 
    required: true,
    trim: true
  },
  webhookSecret: { 
    type: String, 
    required: true, 
    trim: true // ده اللي هنفك بيه التشفير (Signature) في الـ Callback
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

export const GeideaModel = model<IGeidea>('Geidea', geideaSchema);