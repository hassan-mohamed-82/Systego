"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWarehouses = void 0;
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const response_1 = require("../../utils/response");
const getWarehouses = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Get warehouses successfully", data: warehouses });
};
exports.getWarehouses = getWarehouses;
