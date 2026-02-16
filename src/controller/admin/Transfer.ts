import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/index";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";


export const createTransfer = async (req: Request, res: Response) => {
  const { fromWarehouseId, toWarehouseId, products, reason } = req.body;

  // ✅ تحقق من البيانات الأساسية
  if (!fromWarehouseId || !toWarehouseId)
    throw new BadRequest("Both warehouses are required");

  if (!Array.isArray(products) || products.length === 0)
    throw new BadRequest("At least one product is required");

  const fromWarehouse = await WarehouseModel.findById(fromWarehouseId);
  const toWarehouse = await WarehouseModel.findById(toWarehouseId);

  if (!fromWarehouse || !toWarehouse)
    throw new NotFound("One or both warehouses not found");

  // ✅ تحقق من كل منتج في التحويل (مع دعم الـ variations)
  for (const item of products) {
    const { productId, productPriceId, quantity } = item;

    if (!productId || !quantity)
      throw new BadRequest("Each product must have productId and quantity");

    // ✅ التحقق من وجود المنتج
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new NotFound(`Product ${productId} not found`);
    }

    // ✅ لو فيه productPriceId، نتحقق من وجود الـ variation
    if (productPriceId) {
      const productPrice = await ProductPriceModel.findById(productPriceId);
      if (!productPrice) {
        throw new NotFound(`Product variation ${productPriceId} not found`);
      }
      // التأكد من أن الـ variation تابع للمنتج الصحيح
      if (productPrice.productId.toString() !== productId) {
        throw new BadRequest(`Product variation ${productPriceId} does not belong to product ${productId}`);
      }
    }

    // ✅ البحث عن المنتج/الـ variation في المخزن المصدر
    const query: any = {
      productId,
      warehouseId: fromWarehouseId,
    };

    // لو فيه productPriceId نضيفه للـ query
    if (productPriceId) {
      query.productPriceId = productPriceId;
    } else {
      query.productPriceId = null; // المنتج الأساسي بدون variation
    }

    const productInWarehouse = await Product_WarehouseModel.findOne(query);

    if (!productInWarehouse) {
      const variationText = productPriceId ? ` (variation: ${productPriceId})` : "";
      throw new NotFound(`Product ${productId}${variationText} not found in the source warehouse`);
    }

    if (productInWarehouse.quantity < quantity) {
      const variationText = productPriceId ? ` (variation: ${productPriceId})` : "";
      throw new BadRequest(
        `Insufficient quantity for product ${productId}${variationText} in source warehouse. Available: ${productInWarehouse.quantity}, Requested: ${quantity}`
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
    reason,
    status: "pending",
  });

  fromWarehouse.stock_Quantity -= transfer.products.reduce((acc: number, item: any) => acc + item.quantity, 0);
  await fromWarehouse.save();

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
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  // ✳️ تقسيم التحويلات حسب الحالة
  const pending = transfers.filter((t) => t.status === "pending");
  const received = transfers.filter((t) => t.status === "received");

  SuccessResponse(res, {
    message: "Transfers retrieved successfully",
    pending,
    received
  });
};
export const getTransferById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const transfer = await TransferModel.findById(id)
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code")
    .populate("approved_products.productId", "name productCode")
    .populate("approved_products.productPriceId", "price code")
    .populate("rejected_products.productId", "name productCode")
    .populate("rejected_products.productPriceId", "price code");

  if (!transfer) throw new NotFound("Transfer not found");

  SuccessResponse(res, {
    message: "Transfer retrieved successfully",
    transfer,
  });
};


export const updateTransferStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { warehouseId, rejected_products, approved_products, reason } = req.body;

  // 🧩 1. التأكد من وجود التحويل
  const transfer = await TransferModel.findById(id);
  if (!transfer) throw new NotFound("Transfer not found");

  // 🧩 2. التأكد من أن حالته ما زالت pending
  if (transfer.status !== "pending")
    throw new BadRequest("Only pending transfers can be updated");

  // 🧩 3. التأكد من أن المستودع المستلم هو اللي بينفّذ التحديث
  if (transfer.toWarehouseId.toString() !== warehouseId)
    throw new BadRequest("Only the receiving warehouse can update this transfer");

  // ✅ 4. استلام المنتجات المقبولة (مع دعم الـ variations)
  if (approved_products && approved_products.length > 0) {
    for (const item of approved_products) {
      const { productId, productPriceId, quantity } = item;

      // بناء query للبحث عن المنتج/الـ variation في المخزن المستلم
      const query: any = {
        productId,
        warehouseId,
      };

      // لو فيه productPriceId نضيفه للـ query
      if (productPriceId) {
        query.productPriceId = productPriceId;
      } else {
        query.productPriceId = null;
      }

      let productInWarehouse = await Product_WarehouseModel.findOne(query);

      if (productInWarehouse) {
        // لو المنتج/الـ variation موجود، نزود الكمية
        productInWarehouse.quantity += quantity;
        await productInWarehouse.save();
      } else {
        // لو مش موجود، نضيفه كجديد
        await Product_WarehouseModel.create({
          productId,
          productPriceId: productPriceId || null,
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
    transfer.status = "received";
  } else if (rejected_products && rejected_products.length > 0) {
    transfer.status = "rejected";
  }

  await transfer.save();

  // 🏬 7. تحديث المخزون الكلي للمستودع بناءً على المنتجات المقبولة فقط
  const toWarehouse = await WarehouseModel.findById(warehouseId);
  if (toWarehouse && transfer.approved_products && transfer.approved_products.length > 0) {
    const totalApprovedQty = transfer.approved_products.reduce(
      (acc: number, item: any) => acc + item.quantity,
      0
    );

    console.log("Before:", toWarehouse.stock_Quantity);
    console.log("Approved Products:", transfer.approved_products);
    console.log("Added:", totalApprovedQty);

    toWarehouse.stock_Quantity += totalApprovedQty;
    await toWarehouse.save();

    console.log("After:", toWarehouse.stock_Quantity);
  }

  // 🎉 8. إرسال استجابة النجاح
  return SuccessResponse(res, {
    message: "Transfer status updated successfully",
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
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  const pending = transfers.filter((t) => t.status === "pending");
  const received = transfers.filter((t) => t.status === "received");

  SuccessResponse(res, {
    message: "Incoming transfers retrieved successfully",
    pending,
    received
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
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  const pending = transfers.filter((t) => t.status === "pending");
  const received = transfers.filter((t) => t.status === "received");
  SuccessResponse(res, {
    message: "Outgoing transfers retrieved successfully",
    pending,
    received
  });
};


// 🌐 كل التحويلات (للمشرف مثلاً)
export const getalltransfers = async (req: Request, res: Response) => {
  const transfers = await TransferModel.find()
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  SuccessResponse(res, {
    message: "All transfers retrieved successfully",
    transfers,
  });
};