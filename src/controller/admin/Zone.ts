import { Request, Response } from "express";
import {ZoneModel  } from "../../models/schema/admin/Zone";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { CityModels } from "../../models/schema/admin/City";
import { CountryModel } from "../../models/schema/admin/Country";

export const createzone=async(req:Request,res:Response)=>{
    const {name,ar_name, cityId,countryId,cost}=req.body;
    if(!name || !cityId || !countryId || !cost) throw new BadRequest("All fields are required");
    const cityExists=await CityModels.findById(cityId);
    if(!cityExists) throw new BadRequest("City not found");
    const countryExists=await CountryModel.findById(countryId);
    if(!countryExists) throw new BadRequest("Country not found");
    const Zoneexists=await ZoneModel.findOne({name});
    if(Zoneexists) throw new BadRequest("Zone already exists");
    const totalshipingcost=cityExists.shipingCost+cost
    const zone=await ZoneModel.create({name, ar_name, cityId,countryId,cost:totalshipingcost});
    SuccessResponse(res,{message:"Zone created successfully",zone});
}

export const getZones = async (req: Request, res: Response) => {
  const zones = await ZoneModel.find()
    .populate("cityId", "name shipingCost")
    .populate("countryId", "name");

  SuccessResponse(res, {
    message: "Zones fetched successfully",
    zones,
  });
};

export const getZoneById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Zone id is required");

  const zone = await ZoneModel.findById(id)
    .populate("cityId", "name shipingCost")
    .populate("countryId", "name");

  if (!zone) throw new NotFound("Zone not found");

  SuccessResponse(res, {
    message: "Zone fetched successfully",
    zone,
  });
};


export const deleteZone=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Zone id is required");
    const zone=await ZoneModel.findByIdAndDelete(id);
    if(!zone) throw new NotFound("Zone not found");
    SuccessResponse(res,{message:"Zone deleted successfully"});
}

export const updateZone=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Zone id is required");
    const zone=await ZoneModel.findByIdAndUpdate(id,req.body,{new:true});
    if(!zone) throw new NotFound("Zone not found");
    SuccessResponse(res,{message:"Zone updated successfully",zone});
}
