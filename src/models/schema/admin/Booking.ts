import { number } from "joi";
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
    number_of_days: { type: Number, required: true },
    deposit: { type: Number, required: true },
    CustmerId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Custmer" }],
    WarehouseId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }],
    ProductId:[{type:mongoose.Schema.Types.ObjectId,ref:"product"}],
    CategoryId:[{type:mongoose.Schema.Types.ObjectId,ref:"Category"}],
    option_id:[{type:mongoose.Schema.Types.ObjectId,ref:"ProductPriceOption"}],
    status:{type:String,enum:["pending","pay","failer"],default:"pending"},
    
}, { timestamps: true });


export const BookingModel = mongoose.model("Booking", BookingSchema);
