"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getallwarehouses = exports.toggleServiceFeeStatus = exports.deleteServiceFee = exports.updateServiceFee = exports.getServiceFeeById = exports.getAllServiceFees = exports.createServiceFee = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ServiceFee_1 = require("../../models/schema/admin/ServiceFee");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const createServiceFee = async (req, res) => {
    const { title, amount, type, module, warehouseId, status } = req.body;
    if (warehouseId && !mongoose_1.default.Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequest_1.BadRequest("Invalid warehouseId");
    }
    const fee = await ServiceFee_1.ServiceFeeModel.create({
        title,
        amount,
        type,
        module,
        warehouseId: warehouseId || null,
        status,
    });
    const populated = await fee.populate("warehouseId", "name");
    (0, response_1.SuccessResponse)(res, { message: "Service fee created successfully", fee: populated }, 201);
};
exports.createServiceFee = createServiceFee;
const getAllServiceFees = async (req, res) => {
    const { module: mod, type, warehouseId, status } = req.query;
    const filter = {};
    if (mod)
        filter.module = mod;
    if (type)
        filter.type = type;
    if (status !== undefined)
        filter.status = status === "true";
    if (warehouseId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(warehouseId)) {
            throw new BadRequest_1.BadRequest("Invalid warehouseId");
        }
        filter.warehouseId = warehouseId;
    }
    const fees = await ServiceFee_1.ServiceFeeModel.find(filter)
        .populate("warehouseId", "name")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { message: "Service fees fetched successfully", count: fees.length, fees });
};
exports.getAllServiceFees = getAllServiceFees;
const getServiceFeeById = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid ID");
    const fee = await ServiceFee_1.ServiceFeeModel.findById(id).populate("warehouseId", "name");
    if (!fee)
        throw new Errors_1.NotFound("Service fee not found");
    (0, response_1.SuccessResponse)(res, { message: "Service fee fetched successfully", fee });
};
exports.getServiceFeeById = getServiceFeeById;
const updateServiceFee = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid ID");
    const { warehouseId } = req.body;
    if (warehouseId && !mongoose_1.default.Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequest_1.BadRequest("Invalid warehouseId");
    }
    const fee = await ServiceFee_1.ServiceFeeModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
        .populate("warehouseId", "name");
    if (!fee)
        throw new Errors_1.NotFound("Service fee not found");
    (0, response_1.SuccessResponse)(res, { message: "Service fee updated successfully", fee });
};
exports.updateServiceFee = updateServiceFee;
const deleteServiceFee = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid ID");
    const fee = await ServiceFee_1.ServiceFeeModel.findByIdAndDelete(id);
    if (!fee)
        throw new Errors_1.NotFound("Service fee not found");
    (0, response_1.SuccessResponse)(res, { message: "Service fee deleted successfully" });
};
exports.deleteServiceFee = deleteServiceFee;
const toggleServiceFeeStatus = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid ID");
    const fee = await ServiceFee_1.ServiceFeeModel.findById(id);
    if (!fee)
        throw new Errors_1.NotFound("Service fee not found");
    fee.status = !fee.status;
    await fee.save();
    (0, response_1.SuccessResponse)(res, { message: `Service fee ${fee.status ? "activated" : "deactivated"} successfully`, fee });
};
exports.toggleServiceFeeStatus = toggleServiceFeeStatus;
const getallwarehouses = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find().select("name");
    (0, response_1.SuccessResponse)(res, { message: "Warehouses retrieved successfully", warehouses });
};
exports.getallwarehouses = getallwarehouses;
