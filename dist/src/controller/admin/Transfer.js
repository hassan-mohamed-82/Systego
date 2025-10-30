"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getalltransfers = exports.gettransferout = exports.gettransferin = exports.updateTransferStatus = exports.getTransferById = exports.getTransfersForWarehouse = exports.createTransfer = void 0;
const Transfer_1 = require("../../models/schema/admin/Transfer");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const index_1 = require("../../Errors/index");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const response_1 = require("../../utils/response");
const createTransfer = async (req, res) => {
    const { fromWarehouseId, toWarehouseId, products } = req.body;
    // ✅ تحقق من البيانات الأساسية
    if (!fromWarehouseId || !toWarehouseId)
        throw new BadRequest_1.BadRequest("Both warehouses are required");
    if (!Array.isArray(products) || products.length === 0)
        throw new BadRequest_1.BadRequest("At least one product is required");
    const fromWarehouse = await Warehouse_1.WarehouseModel.findById(fromWarehouseId);
    const toWarehouse = await Warehouse_1.WarehouseModel.findById(toWarehouseId);
    if (!fromWarehouse || !toWarehouse)
        throw new index_1.NotFound("One or both warehouses not found");
    // ✅ تحقق من كل منتج في التحويل
    for (const item of products) {
        const { productId, quantity } = item;
        if (!productId || !quantity)
            throw new BadRequest_1.BadRequest("Each product must have productId and quantity");
        const productInWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
            productId,
            warehouseId: fromWarehouseId,
        });
        if (!productInWarehouse) {
            throw new index_1.NotFound(`Product ${productId} not found in the source warehouse`);
        }
        if (productInWarehouse.quantity < quantity) {
            throw new BadRequest_1.BadRequest(`Insufficient quantity for product ${productId} in source warehouse`);
        }
        // خصم الكمية من المخزن المصدر مؤقتًا
        productInWarehouse.quantity -= quantity;
        await productInWarehouse.save();
    }
    // ✅ إنشاء التحويل بعد التحقق من كل المنتجات
    const transfer = await Transfer_1.TransferModel.create({
        fromWarehouseId,
        toWarehouseId,
        products,
        status: "pending",
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Transfer created successfully",
        transfer,
    });
};
exports.createTransfer = createTransfer;
// 🟡 المستودع يشوف كل التحويلات اللي تخصه (pending / received)
const getTransfersForWarehouse = async (req, res) => {
    const { warehouseId } = req.params;
    // 🔍 تحقق من وجود المستودع
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new index_1.NotFound("Warehouse not found");
    // 🔍 جلب كل التحويلات اللي تخص المستودع (مرسل أو مستقبل)
    const transfers = await Transfer_1.TransferModel.find({
        $or: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
    })
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("products.productId", "name productCode");
    // ✳️ تقسيم التحويلات حسب الحالة
    const pending = transfers.filter((t) => t.status === "pending");
    const done = transfers.filter((t) => t.status === "done");
    (0, response_1.SuccessResponse)(res, {
        message: "Transfers retrieved successfully",
        pending,
        done
    });
};
exports.getTransfersForWarehouse = getTransfersForWarehouse;
const getTransferById = async (req, res) => {
    const { id } = req.params;
    const transfer = await Transfer_1.TransferModel.findById(id)
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("products.productId", "name productCode");
    if (!transfer)
        throw new index_1.NotFound("Transfer not found");
    (0, response_1.SuccessResponse)(res, {
        message: "Transfer retrieved successfully",
        transfer,
    });
};
exports.getTransferById = getTransferById;
const updateTransferStatus = async (req, res) => {
    const { id } = req.params;
    const { warehouseId, rejected_products, approved_products, reason } = req.body;
    const transfer = await Transfer_1.TransferModel.findById(id);
    if (!transfer)
        throw new index_1.NotFound("Transfer not found");
    if (transfer.status !== "pending")
        throw new BadRequest_1.BadRequest("Only pending transfers can be updated");
    // تأكد إن اللي بيعمل العملية هو المستودع المستقبل
    if (transfer.toWarehouseId.toString() !== warehouseId)
        throw new BadRequest_1.BadRequest("Only the receiving warehouse can update this transfer");
    // ✅ الحالة الأولى: استلام كامل 
    if (approved_products) {
        for (const item of approved_products) {
            const { productId, quantity } = item;
            let productInWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                productId,
                warehouseId,
            });
            if (productInWarehouse) {
                productInWarehouse.quantity += quantity;
                await productInWarehouse.save();
            }
            else {
                await Product_Warehouse_1.Product_WarehouseModel.create({
                    productId,
                    warehouseId,
                    quantity,
                });
            }
        }
    }
    if (rejected_products) {
        transfer.rejected_products = rejected_products;
        await transfer.save();
    }
    transfer.status = "done";
    await transfer.save();
    return (0, response_1.SuccessResponse)(res, {
        message: "Transfer marked as received successfully",
        transfer,
    });
};
exports.updateTransferStatus = updateTransferStatus;
const gettransferin = async (req, res) => {
    const { warehouseId } = req.params;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new index_1.NotFound("Warehouse not found");
    const transfers = await Transfer_1.TransferModel.find({ toWarehouseId: warehouseId })
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("products.productId", "name productCode");
    const pending = transfers.filter((t) => t.status === "pending");
    const done = transfers.filter((t) => t.status === "done");
    (0, response_1.SuccessResponse)(res, {
        message: "Incoming transfers retrieved successfully",
        pending,
        done
    });
};
exports.gettransferin = gettransferin;
// 📦 التحويلات الخارجة (fromWarehouseId)
const gettransferout = async (req, res) => {
    const { warehouseId } = req.params;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new index_1.NotFound("Warehouse not found");
    const transfers = await Transfer_1.TransferModel.find({ fromWarehouseId: warehouseId })
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("products.productId", "name productCode");
    const pending = transfers.filter((t) => t.status === "pending");
    const done = transfers.filter((t) => t.status === "done");
    (0, response_1.SuccessResponse)(res, {
        message: "Outgoing transfers retrieved successfully",
        pending,
        done
    });
};
exports.gettransferout = gettransferout;
// 🌐 كل التحويلات (للمشرف مثلاً)
const getalltransfers = async (req, res) => {
    const transfers = await Transfer_1.TransferModel.find()
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("products.productId", "name productCode");
    (0, response_1.SuccessResponse)(res, {
        message: "All transfers retrieved successfully",
        transfers,
    });
};
exports.getalltransfers = getalltransfers;
