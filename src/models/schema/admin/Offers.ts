import mongoose from "mongoose";

const OffersSchema=new mongoose.Schema({
    categoryId:[{type:mongoose.Schema.Types.ObjectId,ref:"Category"}],
    productId:[{type:mongoose.Schema.Types.ObjectId,ref:"Product"}],
    discountId:{type:mongoose.Schema.Types.ObjectId,ref:"Discount"},

},{timestamps:true})
export const OffersModel=mongoose.model("Offers",OffersSchema)