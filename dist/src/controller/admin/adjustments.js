"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdjustment = exports.updateAdjustment = exports.getAdjustmentById = exports.getAdjustments = exports.createAdjustment = void 0;
const adjustments_1 = require("../../models/schema/admin/adjustments");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createAdjustment = async (req, res) => {
    const { date, reference, warehouse_id, note } = req.body;
    if (!date || !reference || !warehouse_id) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    // ✅ تأكد إن المخزن موجود
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new BadRequest_1.BadRequest("Invalid warehouse ID");
    const adjustment = await adjustments_1.AdjustmentModel.create({
        date,
        reference,
        warehouse_id,
        note,
    });
    (0, response_1.SuccessResponse)(res, { message: "Adjustment created successfully", adjustment });
};
exports.createAdjustment = createAdjustment;
const getAdjustments = async (req, res) => {
    const adjustments = await adjustments_1.AdjustmentModel.find().populate("warehouse_id", "name address");
    if (!adjustments || adjustments.length === 0)
        throw new Errors_1.NotFound("No adjustments found");
    (0, response_1.SuccessResponse)(res, { message: "Get adjustments successfully", adjustments });
};
exports.getAdjustments = getAdjustments;
const getAdjustmentById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Adjustment ID is required");
    const adjustment = await adjustments_1.AdjustmentModel.findById(id).populate("warehouse_id", "name address");
    if (!adjustment)
        throw new Errors_1.NotFound("Adjustment not found");
    (0, response_1.SuccessResponse)(res, { message: "Get adjustment successfully", adjustment });
};
exports.getAdjustmentById = getAdjustmentById;
const updateAdjustment = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Adjustment ID is required");
    const adjustment = await adjustments_1.AdjustmentModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!adjustment)
        throw new Errors_1.NotFound("Adjustment not found");
    (0, response_1.SuccessResponse)(res, { message: "Adjustment updated successfully", adjustment });
};
exports.updateAdjustment = updateAdjustment;
const deleteAdjustment = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Adjustment ID is required");
    const adjustment = await adjustments_1.AdjustmentModel.findByIdAndDelete(id);
    if (!adjustment)
        throw new Errors_1.NotFound("Adjustment not found");
    (0, response_1.SuccessResponse)(res, { message: "Adjustment deleted successfully" });
};
exports.deleteAdjustment = deleteAdjustment;
