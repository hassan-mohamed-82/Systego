"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getproductWarehousebyid = exports.getproductWarehouse = void 0;
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const index_1 = require("../../Errors/index");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const response_1 = require("../../utils/response");
const getproductWarehouse = async (req, res) => {
    const { warehouse_id } = req.params;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new index_1.NotFound("Warehouse not found");
    const productWarehouses = await Product_Warehouse_1.Product_WarehouseModel.find({ warehouse_id }).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    (0, response_1.SuccessResponse)(res, { productWarehouses });
};
exports.getproductWarehouse = getproductWarehouse;
const getproductWarehousebyid = async (req, res) => {
    const { id } = req.params;
    const productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findById(id).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    if (!productWarehouse)
        throw new index_1.NotFound("Product Warehouse not found");
    (0, response_1.SuccessResponse)(res, { productWarehouse });
};
exports.getproductWarehousebyid = getproductWarehousebyid;
