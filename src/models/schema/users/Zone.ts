import mongoose,{Schema} from "mongoose";
const zoneSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    city: {
        type: Schema.Types.ObjectId, 
        ref: 'City',
        required: true
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    Warehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    }
});
export const Zone = mongoose.model("Zone", zoneSchema);