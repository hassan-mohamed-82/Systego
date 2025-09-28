import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { Zone } from "../../models/schema/users/Zone";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { City } from "../../models/schema/users/City";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";

export const getZones = async (req: Request, res: Response) => {
    const zones = await Zone.find().populate("city","name").populate("Warehouse");
    if (!zones || zones.length === 0) throw new NotFound("No zones found");
    SuccessResponse(res, { message: "get all zones successfully", zones });
}
export const getZoneById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Zone id is required");
    const zone = await Zone.findById(id).populate("city","name").populate("Warehouse");
    if (!zone) throw new NotFound("Zone not found");
    SuccessResponse(res, { message: "get zone successfully", zone });
}
export const createZone = async (req: Request, res: Response) => {
    const { name, city, shippingCost , Warehouse} = req.body;
    if (!name || !city || shippingCost === undefined || !Warehouse) throw new BadRequest("Zone name, city, shippingCost and Warehouse are required");
    const check =await City.findById(city);
    if(!check) throw new NotFound("City not found");
    const sum = shippingCost + check.shippingCost;
    if(sum<0) throw new BadRequest("Total shipping cost can not be negative");
    const existwarehouse = await WarehouseModel.findById(Warehouse);
    if(!existwarehouse) throw new NotFound("Warehouse not found");
    const zone = await Zone.create({ name, city, shippingCost:sum , Warehouse});
    SuccessResponse(res, { message: "create zone successfully", zone });
}   
export const updateZone = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Zone id is required");
    const updateData: any = { ...req.body };
    if (req.body.city) {
        const cityExists = await City.findById(req.body.city);
        if (!cityExists) throw new NotFound("City not found");
    }
    const zone = await Zone.findByIdAndUpdate(id, updateData, { new: true });   
    if (!zone) throw new NotFound("Zone not found");
    SuccessResponse(res, { message: "update zone successfully", zone });
}
export const deleteZone = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Zone id is required");
    const zone = await Zone.findByIdAndDelete(id);
    if (!zone) throw new NotFound("Zone not found");
    SuccessResponse(res, { message: "delete zone successfully", zone });    
};
