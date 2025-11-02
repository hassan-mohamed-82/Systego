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
            WarehouseId: fromWarehouseId,
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
    fromWarehouse.stock_Quantity -= transfer.products.reduce((acc, item) => acc + item.quantity, 0);
    await fromWarehouse.save();
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
    // 🧩 1. التأكد من وجود التحويل
    const transfer = await Transfer_1.TransferModel.findById(id);
    if (!transfer)
        throw new index_1.NotFound("Transfer not found");
    // 🧩 2. التأكد من أن حالته ما زالت pending
    if (transfer.status !== "pending")
        throw new BadRequest_1.BadRequest("Only pending transfers can be updated");
    // 🧩 3. التأكد من أن المستودع المستلم هو اللي بينفّذ التحديث
    if (transfer.toWarehouseId.toString() !== warehouseId)
        throw new BadRequest_1.BadRequest("Only the receiving warehouse can update this transfer");
    // ✅ 4. استلام المنتجات المقبولة
    if (approved_products && approved_products.length > 0) {
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
        // حفظ المنتجات المقبولة داخل التحويل
        transfer.approved_products = approved_products;
    }
    // ❌ 5. حفظ المنتجات المرفوضة (إن وُجدت)
    if (rejected_products && rejected_products.length > 0) {
        transfer.rejected_products = rejected_products;
        transfer.reason = reason || "";
    }
    // ⚙️ 6. تحديد الحالة الجديدة للتحويل
    if (approved_products && approved_products.length > 0) {
        transfer.status = "done";
    }
    else if (rejected_products && rejected_products.length > 0) {
        transfer.status = "rejected";
    }
    await transfer.save();
    // 🏬 7. تحديث المخزون الكلي للمستودع بناءً على المنتجات المقبولة فقط
    const toWarehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (toWarehouse && transfer.approved_products && transfer.approved_products.length > 0) {
        const totalApprovedQty = transfer.approved_products.reduce((acc, item) => acc + item.quantity, 0);
        console.log("Before:", toWarehouse.stock_Quantity);
        console.log("Approved Products:", transfer.approved_products);
        console.log("Added:", totalApprovedQty);
        toWarehouse.stock_Quantity += totalApprovedQty;
        await toWarehouse.save();
        console.log("After:", toWarehouse.stock_Quantity);
    }
    // 🎉 8. إرسال استجابة النجاح
    return (0, response_1.SuccessResponse)(res, {
        message: "Transfer status updated successfully",
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
