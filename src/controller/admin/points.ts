import { Request, Response } from "express";
import { PointModel } from "../../models/schema/admin/points";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createpoint=async(req:Request,res:Response)=>{
    const {amount,points}=req.body;
    if(!amount||!points) throw new BadRequest("Please provide all required fields");
    const point=new PointModel({amount,points});
    await point.save();
    SuccessResponse(res,{message:"Point created successfully",point});
}

export const updatepoint=async(req:Request,res:Response)=>{
    const {id}=req.params;
    const {amount,points}=req.body;
    if(!amount||!points) throw new BadRequest("Please provide all required fields");
    const point=await PointModel.findById(id);
    if(!point) throw new NotFound("Point not found");
    point.amount=amount;
    point.points=points;
    await point.save();
    SuccessResponse(res,{message:"Point updated successfully",point});
}

export const deletepoint=async(req:Request,res:Response)=>{
    const {id}=req.params;
    const point=await PointModel.findByIdAndDelete(id);
    if(!point) throw new NotFound("Point not found");
    SuccessResponse(res,{message:"Point deleted successfully",point});
}

export const getpoints=async(req:Request,res:Response)=>{
    const points=await PointModel.find();
    SuccessResponse(res,{message:"Points found successfully",points});
}

export const getpoint=async(req:Request,res:Response)=>{
    const {id}=req.params;
    const point=await PointModel.findById(id);
    if(!point) throw new NotFound("Point not found");
    SuccessResponse(res,{message:"Point found successfully",point});
}