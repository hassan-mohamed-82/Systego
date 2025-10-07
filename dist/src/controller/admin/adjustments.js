"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdjustmentById = exports.getAdjustments = exports.createAdjustment = void 0;
const adjustments_1 = require("../../models/schema/admin/adjustments");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const products_1 = require("../../models/schema/admin/products");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const handleImages_1 = require("../../utils/handleImages");
const createAdjustment = async (req, res) => {
    const { warehouse_id, note, productId, quantity, select_reasonId, image } = req.body;
    if (!warehouse_id || productId || quantity || select_reasonId) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    // ✅ تأكد إن المخزن موجود
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new BadRequest_1.BadRequest("Invalid warehouse ID");
    const product = await Product_Warehouse_1.Product_WarehouseModel.findById(productId);
    if (!product)
        throw new BadRequest_1.BadRequest("Invalid product ID");
    const products = await products_1.ProductModel.findById(productId);
    if (!products)
        throw new BadRequest_1.BadRequest("Invalid product ID");
    let image_url = " ";
    if (image) {
        image_url = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "adjustments");
    }
    const adjustment = await adjustments_1.AdjustmentModel.create({
        productId,
        quantity,
        select_reasonId,
        warehouse_id,
        note,
        image: image_url
    });
    if (quantity > product.quantity)
        throw new BadRequest_1.BadRequest("Insufficient product quantity");
    if (quantity == product.quantity) {
        warehouse.stock_Quantity -= 1;
    }
    product.quantity -= quantity;
    await product.save();
    products.quantity -= quantity;
    await products.save();
    (0, response_1.SuccessResponse)(res, { message: "Adjustment created successfully", adjustment });
};
exports.createAdjustment = createAdjustment;
const getAdjustments = async (req, res) => {
    const adjustments = await adjustments_1.AdjustmentModel.find().populate("warehouse_id", "name address").populate("select_reasonId").populate("productId", "name");
    (0, response_1.SuccessResponse)(res, { message: "Get adjustments successfully", adjustments });
};
exports.getAdjustments = getAdjustments;
const getAdjustmentById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Adjustment ID is required");
    const adjustment = await adjustments_1.AdjustmentModel.findById(id)
        .populate("warehouse_id", "name address")
        .populate("select_reasonId")
        .populate("productId", "name");
    if (!adjustment)
        throw new Errors_1.NotFound("Adjustment not found");
    (0, response_1.SuccessResponse)(res, { message: "Get adjustment successfully", adjustment });
};
exports.getAdjustmentById = getAdjustmentById;
