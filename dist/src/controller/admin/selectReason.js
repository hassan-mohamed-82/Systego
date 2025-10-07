"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSelectReason = exports.deleteSelectReason = exports.getSelectReason = exports.createSelectReason = void 0;
const selectReason_1 = require("../../models/schema/admin/selectReason");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createSelectReason = async (req, res) => {
    const { reason } = req.body;
    if (!reason)
        throw new BadRequest_1.BadRequest("Reason is required");
    const createReason = await selectReason_1.SelectReasonModel.create({ reason });
    if (!createReason)
        throw new Errors_1.NotFound("Reason not found");
    (0, response_1.SuccessResponse)(res, { message: "Create Reason Successfully", createReason });
};
exports.createSelectReason = createSelectReason;
const getSelectReason = async (req, res) => {
    const reason = await selectReason_1.SelectReasonModel.find();
    if (!reason || reason.length === 0)
        throw new Errors_1.NotFound("Reason not found");
    (0, response_1.SuccessResponse)(res, { message: "Get Reason Successfully", reason });
};
exports.getSelectReason = getSelectReason;
const deleteSelectReason = async (req, res) => {
    const { id } = req.params;
    const reason = await selectReason_1.SelectReasonModel.findByIdAndDelete(id);
    if (!reason)
        throw new Errors_1.NotFound("Reason not found");
    (0, response_1.SuccessResponse)(res, { message: "Delete Reason Successfully", reason });
};
exports.deleteSelectReason = deleteSelectReason;
const updateSelectReason = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    const reason = await selectReason_1.SelectReasonModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!reason)
        throw new Errors_1.NotFound("Reason not found");
    (0, response_1.SuccessResponse)(res, { message: "Update Reason Successfully", reason });
};
exports.updateSelectReason = updateSelectReason;
