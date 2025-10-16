import mongoose from "mongoose";

const PaymobSchema=new mongoose.Schema({
    type:{type:String,required:true,enum:["live","test"]},
    callback:{type:String,required:true},
    api_key:{type:String,required:true},
    iframe_id:{type:String,required:true},
    integration_id:{type:String,required:true},
    hmac_key:{type:String,required:true},
    payment_method_id:{type:String,required:true},
})

export const PaymobModel=mongoose.model("Paymob",PaymobSchema)