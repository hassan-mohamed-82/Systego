import { randomUUID } from "crypto";
import { number } from "joi";
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
    number_of_days: { type: Number, required: true },
    deposit: { type: Number, required: true },
    CustmerId: { type: mongoose.Schema.Types.String, ref: "Customer" },
    WarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    ProductId:{type:mongoose.Schema.Types.ObjectId,ref:"Product"},
    CategoryId:{type:mongoose.Schema.Types.ObjectId,ref:"Category"},
    option_id:{type:mongoose.Schema.Types.ObjectId,ref:"ProductPriceOption"},
    status:{type:String,enum:["pending","pay","failer"],default:"pending"},
    _id: { type: String, default: randomUUID },
}, { _id:false, timestamps: true });


export const BookingModel = mongoose.model("Booking", BookingSchema);
