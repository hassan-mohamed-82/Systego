import { Request, Response } from "express";
import { CouponModel  } from "../../models/schema/admin/coupons";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createcoupons=async(req:Request,res:Response)=>{
    const {coupon_code,type,amount,minimum_amount,quantity,available,expired_date}=req.body;
    if(!coupon_code||!type||!amount||!minimum_amount||!quantity||!available||!expired_date) throw new BadRequest("Please provide all required fields");
    const coupon=new CouponModel({
        coupon_code,
        type,
        amount,
        minimum_amount,
        quantity,
        available,
        expired_date,
    });
    await coupon.save();
    SuccessResponse(res,{message:"Coupon created successfully",coupon});
}

export const getcoupons=async(req:Request,res:Response)=>{
    const coupons=await CouponModel.find();
    if(!coupons||coupons.length===0) throw new NotFound("No coupons found");
    SuccessResponse(res,{message:"Get coupons successfully",coupons});
}

export const getcouponById=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Coupon ID is required");
    const coupon=await CouponModel.findById(id);
    if(!coupon) throw new NotFound("Coupon not found");
    SuccessResponse(res,{message:"Get coupon successfully",coupon});
}

export const deletecoupon=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Coupon ID is required");
    const coupon=await CouponModel.findByIdAndDelete(id);
    if(!coupon) throw new NotFound("Coupon not found");
    SuccessResponse(res,{message:"Coupon deleted successfully",coupon});
}

export const updatecoupon=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Coupon ID is required");
    const coupon=await CouponModel.findByIdAndUpdate(id,req.body,{new:true});
    if(!coupon) throw new NotFound("Coupon not found");
    SuccessResponse(res,{message:"Coupon updated successfully",coupon});
}