import { Request, Response } from "express";
import {  WarehouseModel} from "../../models/schema/admin/Warehouse";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createWarehouse = async (req: Request, res: Response) => {
    const { name, address, phone, email } = req.body;

    if (!name || !address || !phone || !email) {
        throw new BadRequest("Name, address, phone, and email are required");
    }
    const warehouse = await WarehouseModel.create({
        name,
        address,
        phone,
        email,
    });
    SuccessResponse(res, { message: "Create warehouse successfully", warehouse });
};

export const getWarehouses = async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find();
    if (!warehouses || warehouses.length === 0) throw new NotFound("No warehouses found");
    SuccessResponse(res, { message: "Get warehouses successfully", warehouses });
};

export const getWarehouseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Warehouse ID is required");
    const warehouse = await WarehouseModel.findById(id);
    if (!warehouse) throw new NotFound("Warehouse not found");
    SuccessResponse(res, { message: "Get warehouse successfully", warehouse });
};

export const updateWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Warehouse ID is required");
    const updateData: any = { ...req.body, updated_at: new Date() };
    const warehouse = await WarehouseModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!warehouse) throw new NotFound("Warehouse not found");
    SuccessResponse(res, { message: "Update warehouse successfully", warehouse });
};

export const deleteWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Warehouse ID is required");
    const warehouse = await WarehouseModel.findByIdAndDelete(id);
    if (!warehouse) throw new NotFound("Warehouse not found");
    SuccessResponse(res, { message: "Delete warehouse successfully", warehouse });
};