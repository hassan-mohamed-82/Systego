import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer.js";
import { WarehouseModel } from "../../models/schema/admin/Warehouse.js";
import { BadRequest } from "../../Errors/BadRequest.js";
import { NotFound } from "../../Errors/index.js";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse.js";
import { SuccessResponse } from "../../utils/response.js";
import { ProductModel } from "../../models/schema/admin/products.js";


// 🟢 إنشاء تحويل جديد (يبدأ pending)
export const createTransfer = async (req: Request, res: Response) => {
  
    const { fromWarehouseId, toWarehouseId, quantity, productId, categoryId, productCode } = req.body;

    if (!fromWarehouseId || !toWarehouseId)
      throw new BadRequest("Both warehouses are required");

    if (!productId && !categoryId && !productCode)
      throw new BadRequest("Please provide productId or categoryId or productCode");

    const fromWarehouse = await WarehouseModel.findById(fromWarehouseId);
    const toWarehouse = await WarehouseModel.findById(toWarehouseId);
    const productInWarehouse = await Product_WarehouseModel.findOne({productId, warehouseId: fromWarehouseId});
    if(!productInWarehouse){
      throw new NotFound("Product not found in the source warehouse");
    }
    if(productInWarehouse.quantity < quantity){
      throw new BadRequest("Insufficient product quantity in the source warehouse");
    }

    if (!fromWarehouse || !toWarehouse)
      throw new NotFound("One or both warehouses not found");

    const transfer = await TransferModel.create({
      fromWarehouseId,
      toWarehouseId,
      productId,
      categoryId,
      productCode,
      quantity,
      status: "pending",
    });

    productInWarehouse.quantity -= quantity;
    await productInWarehouse.save();
    const product = await ProductModel.findById(productId) as any;
    if(product){
      product.quantity -= quantity;
      await product.save();
    }
    SuccessResponse(res, { message: "Transfer created successfully", transfer });  
};


// 🟡 المستودع يشوف كل التحويلات اللي تخصه (pending / received)
export const getTransfersForWarehouse = async (req: Request, res: Response) => {
  
    const { warehouseId } = req.params;

    const warehouse = await WarehouseModel.findById(warehouseId);
    if (!warehouse) throw new NotFound("Warehouse not found");

    // كل التحويلات اللي تخص المستودع سواء كان مرسل أو مستقبل
    const transfers = await TransferModel.find({
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

     SuccessResponse(res, { message: "Transfers retrieved successfully", pending, received });
  
};

export const getTransferById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const transfer = await TransferModel.findById(id)
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("productId", "name productCode");
  if (!transfer) throw new NotFound("Transfer not found");
  SuccessResponse(res, { message: "Transfer retrieved successfully", transfer });
};


// 🟢 تحديث التحويل إلى received (بس المستودع المستقبل يقدر)
export const markTransferAsReceived = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { warehouseId } = req.body; // المستودع اللي بيعمل العملية

    const transfer = await TransferModel.findById(id);
    if (!transfer) throw new NotFound("Transfer not found");

    // لو التحويل مش pending مينفعش يتعدل
    if (transfer.status !== "pending")
      throw new BadRequest("Only pending transfers can be received");

    // تحقق إن المستودع المستقبل هو اللي بيعمل الاستلام
    if (transfer.toWarehouseId.toString() !== warehouseId)
      throw new BadRequest("Only the receiving warehouse can mark this transfer as received");

    // تحديث الحالة
    transfer.status = "received";
    await transfer.save();

    SuccessResponse(res, { message: "Transfer marked as received successfully", transfer });  
};

export const gettransferin = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse)
    throw new NotFound("Warehouse not found");
  // كل التحويلات اللي تخص المستودع سواء كان مرسل أو مستقبل
  const transfers = await TransferModel.find({
    $or: [
      { toWarehouseId: warehouseId },
    ],
  })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("productId", "name productCode");
  const pending = transfers.filter(t => t.status === "pending");
  const received = transfers.filter(t => t.status === "received");
  SuccessResponse(res, { message: "Transfers retrieved successfully", pending, received });
};
export const gettransferout = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse)
    throw new NotFound("Warehouse not found");
  // كل التحويلات اللي تخص المستودع سواء كان مرسل أو مستقبل
  const transfers = await TransferModel.find({
    $or: [
      { fromWarehouseId: warehouseId },
    ],
  })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("productId", "name productCode");
  const pending = transfers.filter(t => t.status === "pending");
  const received = transfers.filter(t => t.status === "received");
  SuccessResponse(res, { message: "Transfers retrieved successfully", pending, received });
};
