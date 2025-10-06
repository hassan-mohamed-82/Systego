"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getproductWarehousebyid = exports.getproductWarehouse = void 0;
const Warehouse_js_1 = require("../../models/schema/admin/Warehouse.js");
const index_js_1 = require("../../Errors/index.js");
const Product_Warehouse_js_1 = require("../../models/schema/admin/Product_Warehouse.js");
const response_js_1 = require("../../utils/response.js");
const getproductWarehouse = async (req, res) => {
    const { warehouse_id } = req.params;
    const warehouse = await Warehouse_js_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new index_js_1.NotFound("Warehouse not found");
    const productWarehouses = await Product_Warehouse_js_1.Product_WarehouseModel.find({ warehouse_id }).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    (0, response_js_1.SuccessResponse)(res, { productWarehouses });
};
exports.getproductWarehouse = getproductWarehouse;
const getproductWarehousebyid = async (req, res) => {
    const { id } = req.params;
    const productWarehouse = await Product_Warehouse_js_1.Product_WarehouseModel.findById(id).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    if (!productWarehouse)
        throw new index_js_1.NotFound("Product Warehouse not found");
    (0, response_js_1.SuccessResponse)(res, { productWarehouse });
};
exports.getproductWarehousebyid = getproductWarehousebyid;
