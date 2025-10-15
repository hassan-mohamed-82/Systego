import mongoose from "mongoose";

const PointShcema =new mongoose.Schema({
    amount:{type:Number,required:true,min:0},
    points:{type:Number,required:true,min:0},
})

export const PointModel = mongoose.model("Point", PointShcema);