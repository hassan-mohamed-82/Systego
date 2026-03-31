"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderTypeStatus = exports.getOrderTypes = void 0;
const ordertype_1 = require("../../models/schema/admin/ordertype");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getOrderTypes = async (req, res) => {
    const types = await ordertype_1.OrderTypeModel.find();
    (0, response_1.SuccessResponse)(res, { message: "get all order types successfully", data: types });
};
exports.getOrderTypes = getOrderTypes;
const updateOrderTypeStatus = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("order type id is required");
    const { isActive } = req.body;
    const orderType = await ordertype_1.OrderTypeModel.findById(id);
    if (!orderType)
        throw new Errors_1.NotFound("order type not found");
    const updated = await ordertype_1.OrderTypeModel.findByIdAndUpdate(id, { isActive }, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "update order type successfully", data: updated });
};
exports.updateOrderTypeStatus = updateOrderTypeStatus;
