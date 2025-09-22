import { UnauthorizedError } from "../Errors/";
import { SuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import { ProductsModel } from "../models/schema/products";
import { saveBase64Image } from "../utils/handleImages";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/";

export const createproduct=async(req:Request,res:Response)=>{
    const{name,code,icon,quantity,brand_id,category_id,unit,price,cost,stock_worth,exp_date,notify_near_expiry}=req.body;
    if(!name||!code||!quantity||!brand_id||!category_id||!unit||!price||!stock_worth||!exp_date||!notify_near_expiry)
    throw new BadRequest("All fields are required");

    let imageUrl=""
    if(icon){
        imageUrl=await saveBase64Image(icon,Date.now().toString(),req,"product")
    }
    const product=await ProductsModel.create({name,code,icon:imageUrl,quantity,brand_id,category_id,unit,price,cost,stock_worth,exp_date,notify_near_expiry})
    SuccessResponse(res,{message:"create product successfully",product})
    }

export const getProducts=async(req:Request,res:Response)=>{
    const products=await ProductsModel.find({}).populate("brand_id","brand_name").populate("category_id","category_name");
    if(!products||products.length===0) throw new NotFound("No products found");
    SuccessResponse(res,{message:"get products successfully",products})
}    

export const getProductById=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Product id is required");
    const product=await ProductsModel.findById(id).populate("brand_id","brand_name").populate("category_id","category_name");
    if(!product) throw new NotFound("Product not found");
    SuccessResponse(res,{message:"get product successfully",product})
}

export const deleteProduct=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Product id is required");
    const product=await ProductsModel.findByIdAndDelete(id);
    if(!product) throw new NotFound("Product not found");
    SuccessResponse(res,{message:"delete product successfully"})
}

export const updateProduct=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Product id is required");
    const product=await ProductsModel.findByIdAndUpdate(id,req.body,{new:true});
    if(!product) throw new NotFound("Product not found");
    SuccessResponse(res,{message:"update product successfully",product})
}

