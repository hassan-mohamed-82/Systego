import mongoose, { Schema } from "mongoose";

const DeliverySchema = new mongoose.Schema({
    name:{type:String,required:true},
    phone_number:{type:String,required:true},
    warehouse_id:{type:Schema.Types.ObjectId,ref:"Warehouse",required:true},
    status:{type:Boolean,default:true},
    photo:{type:String},
    identity_type:{type:String,enum:["ID","Passport"]},
    identity_number:{type:String},
    identity_photo:{type:String},
    email:{type:String},
    password:{type:String},
    
});

export const DeliveryModel = mongoose.model("Delivery", DeliverySchema);