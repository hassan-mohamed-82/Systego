"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTypes = void 0;
const ordertype_1 = require("../../models/schema/admin/ordertype");
const response_1 = require("../../utils/response");
const getOrderTypes = async (req, res) => {
    const types = await ordertype_1.OrderTypeModel.find({ isActive: true });
    (0, response_1.SuccessResponse)(res, { message: "get all order types successfully", data: types });
};
exports.getOrderTypes = getOrderTypes;
