import mongoose from "mongoose";

const redeem_PointsShcema =new mongoose.Schema({
    amount:{type:Number,required:true,min:0},
    points:{type:Number,required:true,min:0},
})

export const redeem_PointsModel = mongoose.model("redeem_Points", redeem_PointsShcema);