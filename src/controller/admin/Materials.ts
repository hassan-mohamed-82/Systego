import { Request,Response } from "express";
import { MaterialModel } from "../../models/schema/admin/Materials";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";

export const getMaterials = async (req:Request, res:Response) => {
  const materials = await MaterialModel.find();
  return SuccessResponse(res,{message:"fetched successfully", materials});
}

export const getMaterial = async (req:Request, res:Response) => {
  const {matrialId} = req.params;
  if(!matrialId) throw new BadRequest("material id is required");
  const material = await MaterialModel.findById(matrialId).populate("category_id", "name ar_name photo ");
  if(!material) throw new NotFound("material not found");
  return SuccessResponse(res,{message:"fetched successfully", material});
}

export const deleteMaterial = async (req:Request, res:Response) => {
  const {matrialId} = req.params;
  if(!matrialId) throw new BadRequest("material id is required");
  const material = await MaterialModel.findByIdAndDelete(matrialId);
  if(!material) throw new NotFound("material not found");
  if (material.photo != null) deletePhotoFromServer(material.photo);
 
  return SuccessResponse(res,{message:"material deleted successfully"});
}

export const creatematerial=async(req:Request, res:Response) => {
  const {name,ar_name,photo,description,ar_description,category_id,quantity,expired_ability,date_of_expiry,low_stock,unit}=req.body;
  const material = await MaterialModel.create({name,ar_name,photo,description,ar_description,category_id,quantity,expired_ability,date_of_expiry,low_stock,unit});
  return SuccessResponse(res,{message:"material created successfully", material});
}