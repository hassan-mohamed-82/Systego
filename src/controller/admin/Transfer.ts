import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/index";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";


export const createTransfer = async (req: Request, res: Response) => {
  const { fromWarehouseId, toWarehouseId, products } = req.body;

  // ✅ تحقق من البيانات الأساسية
  if (!fromWarehouseId || !toWarehouseId)
    throw new BadRequest("Both warehouses are required");

  if (!Array.isArray(products) || products.length === 0)
    throw new BadRequest("At least one product is required");

  const fromWarehouse = await WarehouseModel.findById(fromWarehouseId);
  const toWarehouse = await WarehouseModel.findById(toWarehouseId);

  if (!fromWarehouse || !toWarehouse)
    throw new NotFound("One or both warehouses not found");

  // ✅ تحقق من كل منتج في التحويل
  for (const item of products) {
    const { productId, quantity } = item;

    if (!productId || !quantity)
      throw new BadRequest("Each product must have productId and quantity");

    const productInWarehouse = await Product_WarehouseModel.findOne({
      productId,
    WarehouseId: fromWarehouseId,
    });

    if (!productInWarehouse) {
      throw new NotFound(`Product ${productId} not found in the source warehouse`);
    }

    if (productInWarehouse.quantity < quantity) {
      throw new BadRequest(
        `Insufficient quantity for product ${productId} in source warehouse`
      );
    }

    // خصم الكمية من المخزن المصدر مؤقتًا
    productInWarehouse.quantity -= quantity;
    await productInWarehouse.save();
  }

  // ✅ إنشاء التحويل بعد التحقق من كل المنتجات
  const transfer = await TransferModel.create({
    fromWarehouseId,
    toWarehouseId,
    products,
    status: "pending",
  });

  SuccessResponse(res, {
    message: "Transfer created successfully",
    transfer,
  });
};



// 🟡 المستودع يشوف كل التحويلات اللي تخصه (pending / received)
export const getTransfersForWarehouse = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  // 🔍 تحقق من وجود المستودع
  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  // 🔍 جلب كل التحويلات اللي تخص المستودع (مرسل أو مستقبل)
  const transfers = await TransferModel.find({
    $or: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
  })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode");

  // ✳️ تقسيم التحويلات حسب الحالة
  const pending = transfers.filter((t) => t.status === "pending");
  const done = transfers.filter((t) => t.status === "done");

  SuccessResponse(res, {
    message: "Transfers retrieved successfully",
    pending,
    done
  });
};
export const getTransferById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const transfer = await TransferModel.findById(id)
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode");

  if (!transfer) throw new NotFound("Transfer not found");

  SuccessResponse(res, {
    message: "Transfer retrieved successfully",
    transfer,
  });
};


export const updateTransferStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { warehouseId, rejected_products, approved_products, reason } = req.body;

  const transfer = await TransferModel.findById(id);

  if (!transfer) throw new NotFound("Transfer not found");
  if (transfer.status !== "pending")
    throw new BadRequest("Only pending transfers can be updated");

  // تأكد إن اللي بيعمل العملية هو المستودع المستقبل
  if (transfer.toWarehouseId.toString() !== warehouseId)
    throw new BadRequest("Only the receiving warehouse can update this transfer");

  // ✅ الحالة الأولى: استلام كامل 

    if(approved_products){
      for (const item of approved_products) {
        const { productId, quantity } = item;

        let productInWarehouse = await Product_WarehouseModel.findOne({
          productId,
          warehouseId,
        });

        if (productInWarehouse) {
          productInWarehouse.quantity += quantity;
          await productInWarehouse.save();
        } else {
          await Product_WarehouseModel.create({
            productId,
            warehouseId,
            quantity,
          });
        }
      }
    }

    if(rejected_products){
      transfer.rejected_products = rejected_products;
      await transfer.save();
    }
    transfer.status = "done";
    await transfer.save();

    return SuccessResponse(res, {
      message: "Transfer marked as received successfully",
      transfer,
    });
};

export const gettransferin = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const transfers = await TransferModel.find({ toWarehouseId: warehouseId })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode");

  const pending = transfers.filter((t) => t.status === "pending");
  const done = transfers.filter((t) => t.status === "done");

  SuccessResponse(res, {
    message: "Incoming transfers retrieved successfully",
    pending,
    done
  });
};


// 📦 التحويلات الخارجة (fromWarehouseId)
export const gettransferout = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const transfers = await TransferModel.find({ fromWarehouseId: warehouseId })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode");

  const pending = transfers.filter((t) => t.status === "pending");
  const done = transfers.filter((t) => t.status === "done");
  SuccessResponse(res, {
    message: "Outgoing transfers retrieved successfully",
    pending,
    done
  });
};


// 🌐 كل التحويلات (للمشرف مثلاً)
export const getalltransfers = async (req: Request, res: Response) => {
  const transfers = await TransferModel.find()
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode");

  SuccessResponse(res, {
    message: "All transfers retrieved successfully",
    transfers,
  });
};