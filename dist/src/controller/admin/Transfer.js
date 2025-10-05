"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markTransferAsReceived = exports.getTransfersForWarehouse = exports.createTransfer = void 0;
const Transfer_js_1 = require("../../models/schema/admin/Transfer.js");
const Warehouse_js_1 = require("../../models/schema/admin/Warehouse.js");
const BadRequest_js_1 = require("../../Errors/BadRequest.js");
const index_js_1 = require("../../Errors/index.js");
const response_js_1 = require("../../utils/response.js");
// 🟢 إنشاء تحويل جديد (يبدأ pending)
const createTransfer = async (req, res) => {
    const { fromWarehouseId, toWarehouseId, quantity, productId, categoryId, productCode } = req.body;
    if (!fromWarehouseId || !toWarehouseId)
        throw new BadRequest_js_1.BadRequest("Both warehouses are required");
    if (!productId && !categoryId && !productCode)
        throw new BadRequest_js_1.BadRequest("Please provide productId or categoryId or productCode");
    const fromWarehouse = await Warehouse_js_1.WarehouseModel.findById(fromWarehouseId);
    const toWarehouse = await Warehouse_js_1.WarehouseModel.findById(toWarehouseId);
    if (!fromWarehouse || !toWarehouse)
        throw new index_js_1.NotFound("One or both warehouses not found");
    const transfer = await Transfer_js_1.TransferModel.create({
        fromWarehouseId,
        toWarehouseId,
        productId,
        categoryId,
        productCode,
        quantity,
        status: "pending",
    });
    (0, response_js_1.SuccessResponse)(res, { message: "Transfer created successfully", transfer });
};
exports.createTransfer = createTransfer;
// 🟡 المستودع يشوف كل التحويلات اللي تخصه (pending / received)
const getTransfersForWarehouse = async (req, res) => {
    const { warehouseId } = req.params;
    const warehouse = await Warehouse_js_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new index_js_1.NotFound("Warehouse not found");
    // كل التحويلات اللي تخص المستودع سواء كان مرسل أو مستقبل
    const transfers = await Transfer_js_1.TransferModel.find({
        $or: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId },
        ],
    })
        .populate("fromWarehouseId", "name")
        .populate("toWarehouseId", "name")
        .populate("productId", "name productCode");
    const pending = transfers.filter(t => t.status === "pending");
    const received = transfers.filter(t => t.status === "received");
    (0, response_js_1.SuccessResponse)(res, { message: "Transfers retrieved successfully", pending, received });
};
exports.getTransfersForWarehouse = getTransfersForWarehouse;
// 🟢 تحديث التحويل إلى received (بس المستودع المستقبل يقدر)
const markTransferAsReceived = async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.body; // المستودع اللي بيعمل العملية
    const transfer = await Transfer_js_1.TransferModel.findById(id);
    if (!transfer)
        throw new index_js_1.NotFound("Transfer not found");
    // لو التحويل مش pending مينفعش يتعدل
    if (transfer.status !== "pending")
        throw new BadRequest_js_1.BadRequest("Only pending transfers can be received");
    // تحقق إن المستودع المستقبل هو اللي بيعمل الاستلام
    if (transfer.toWarehouseId.toString() !== warehouseId)
        throw new BadRequest_js_1.BadRequest("Only the receiving warehouse can mark this transfer as received");
    // تحديث الحالة
    transfer.status = "received";
    await transfer.save();
    (0, response_js_1.SuccessResponse)(res, { message: "Transfer marked as received successfully", transfer });
};
exports.markTransferAsReceived = markTransferAsReceived;
