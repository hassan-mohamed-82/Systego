import mongoose, { Schema } from "mongoose";

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone_number: { type: String, required: true },
    address: { type: String },
    country: { type: Schema.Types.ObjectId, ref: 'Country' },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    customer_group_id: { type: Schema.Types.ObjectId, ref: 'CustomerGroup' },
    total_points_earned: { type: Number, default: 0, min: 0 },
    is_Due:{type:Boolean,default:false},
    amount_Due:{type:Number,default:0},
  },
  { timestamps: true }
);

const CustomerGroupSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const CustomerModel = mongoose.model("Customer", CustomerSchema);
export const CustomerGroupModel = mongoose.model("CustomerGroup", CustomerGroupSchema);

