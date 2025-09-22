"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWarehouse = exports.updateWarehouse = exports.getWarehouseById = exports.getWarehouses = exports.createWarehouse = void 0;
const Warehouse_1 = require("../models/schema/Warehouse");
const BadRequest_1 = require("../Errors/BadRequest");
const Errors_1 = require("../Errors");
const response_1 = require("../utils/response");
const createWarehouse = async (req, res) => {
    const { name, address, phone, email } = req.body;
    if (!name || !address || !phone || !email) {
        throw new BadRequest_1.BadRequest("Name, address, phone, and email are required");
    }
    const warehouse = await Warehouse_1.WarehouseModel.create({
        name,
        address,
        phone,
        email,
    });
    (0, response_1.SuccessResponse)(res, { message: "Create warehouse successfully", warehouse });
};
exports.createWarehouse = createWarehouse;
const getWarehouses = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find();
    if (!warehouses || warehouses.length === 0)
        throw new Errors_1.NotFound("No warehouses found");
    (0, response_1.SuccessResponse)(res, { message: "Get warehouses successfully", warehouses });
};
exports.getWarehouses = getWarehouses;
const getWarehouseById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const warehouse = await Warehouse_1.WarehouseModel.findById(id);
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    (0, response_1.SuccessResponse)(res, { message: "Get warehouse successfully", warehouse });
};
exports.getWarehouseById = getWarehouseById;
const updateWarehouse = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const updateData = { ...req.body, updated_at: new Date() };
    const warehouse = await Warehouse_1.WarehouseModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    (0, response_1.SuccessResponse)(res, { message: "Update warehouse successfully", warehouse });
};
exports.updateWarehouse = updateWarehouse;
const deleteWarehouse = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const warehouse = await Warehouse_1.WarehouseModel.findByIdAndDelete(id);
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    (0, response_1.SuccessResponse)(res, { message: "Delete warehouse successfully", warehouse });
};
exports.deleteWarehouse = deleteWarehouse;
