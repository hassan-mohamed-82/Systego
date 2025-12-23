"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWarehouse = exports.getWarehouseById = exports.updateWarehouse = exports.getWarehouses = exports.createWarehouse = void 0;
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
// Helper function لتحديث حالة Online
const setOnlineStatus = async (warehouseId) => {
    // خلي كل المخازن التانية offline
    await Warehouse_1.WarehouseModel.updateMany({ _id: { $ne: warehouseId } }, { Is_Online: false });
};
const createWarehouse = async (req, res) => {
    const { name, address, phone, email, Is_Online } = req.body;
    if (!name || !address || !phone || !email) {
        throw new BadRequest_1.BadRequest("Name, address, phone, and email are required");
    }
    const existingWarehouse = await Warehouse_1.WarehouseModel.findOne({ name });
    if (existingWarehouse)
        throw new BadRequest_1.BadRequest("Warehouse already exists");
    // لو المخزن الجديد هيكون online، خلي الباقي offline الأول
    if (Is_Online === true) {
        await Warehouse_1.WarehouseModel.updateMany({}, { Is_Online: false });
    }
    const warehouse = await Warehouse_1.WarehouseModel.create({
        name,
        address,
        phone,
        email,
        Is_Online: Is_Online || false,
    });
    (0, response_1.SuccessResponse)(res, { message: "Create warehouse successfully", warehouse });
};
exports.createWarehouse = createWarehouse;
const getWarehouses = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Get warehouses successfully", warehouses });
};
exports.getWarehouses = getWarehouses;
const updateWarehouse = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    // لو بيحدث المخزن ليكون online، خلي الباقي offline الأول
    if (req.body.Is_Online === true) {
        await Warehouse_1.WarehouseModel.updateMany({ _id: { $ne: id } }, { Is_Online: false });
    }
    const warehouse = await Warehouse_1.WarehouseModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    (0, response_1.SuccessResponse)(res, { message: "Update warehouse successfully", warehouse });
};
exports.updateWarehouse = updateWarehouse;
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
const deleteWarehouse = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const warehouse = await Warehouse_1.WarehouseModel.findByIdAndDelete(id);
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    (0, response_1.SuccessResponse)(res, { message: "Delete warehouse successfully" });
};
exports.deleteWarehouse = deleteWarehouse;
