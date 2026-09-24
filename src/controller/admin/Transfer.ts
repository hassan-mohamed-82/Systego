import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/index";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";

// =========================================================
// Types
// =========================================================
interface NormalizedProduct {
  productId: string;
  productPriceId: string | null;
  quantity: number;
}

// =========================================================
// Helpers
// =========================================================
const extractId = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val._id) return val._id.toString();
  return val.toString();
};

const keyOf = (productId: string, productPriceId?: string | null) =>
  `${productId}:${productPriceId || "null"}`;

const parseKey = (k: string) => {
  const [productId, productPriceIdRaw] = k.split(":");
  return {
    productId,
    productPriceId: productPriceIdRaw === "null" ? null : productPriceIdRaw,
  };
};

// =========================================================
// CREATE TRANSFER
// ✅ مفيش خصم - مجرد التحقق + إنشاء transfer بحالة pending
// =========================================================
export const createTransfer = async (req: Request, res: Response) => {
  const { fromWarehouseId, toWarehouseId, products, reason } = req.body;

  if (!fromWarehouseId || !toWarehouseId)
    throw new BadRequest("Both warehouses are required");

  if (fromWarehouseId === toWarehouseId)
    throw new BadRequest("Source and destination warehouse must be different");

  if (!Array.isArray(products) || products.length === 0)
    throw new BadRequest("At least one product is required");

  const fromWarehouse = await WarehouseModel.findById(fromWarehouseId);
  const toWarehouse = await WarehouseModel.findById(toWarehouseId);

  if (!fromWarehouse || !toWarehouse)
    throw new NotFound("One or both warehouses not found");

  // =========================================================
  // Normalize products
  // =========================================================
  const normalizedProducts: NormalizedProduct[] = products.map(
    (item: any): NormalizedProduct => {
      const productId = extractId(item.productId);
      const productPriceId = extractId(item.productPriceId);

      if (!productId) {
        throw new BadRequest("Product ID is required for each item");
      }

      return {
        productId,
        productPriceId,
        quantity: Number(item.quantity),
      };
    },
  );

  // =========================================================
  // Validate products + الكمية المتاحة (بدون خصم)
  // =========================================================
  for (const item of normalizedProducts) {
    const { productId, productPriceId, quantity } = item;

    if (!quantity || quantity <= 0)
      throw new BadRequest("Each product must have a positive quantity");

    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFound(`Product ${productId} not found`);

    if (productPriceId) {
      const productPrice = await ProductPriceModel.findById(productPriceId);
      if (!productPrice)
        throw new NotFound(`Product variation ${productPriceId} not found`);

      if (productPrice.productId.toString() !== productId) {
        throw new BadRequest(
          `Product variation ${productPriceId} does not belong to product ${productId}`,
        );
      }
    }

    // ✅ التحقق من الكمية المتاحة (بدون خصم)
    const existingStock = await Product_WarehouseModel.findOne({
      productId,
      productPriceId: productPriceId || null,
      warehouseId: fromWarehouseId,
    });

    const available = existingStock?.quantity ?? 0;

    console.log("=== CREATE: CHECK STOCK ===", {
      productId,
      productPriceId,
      warehouseId: fromWarehouseId,
      available,
      requested: quantity,
    });

    if (available < quantity) {
      const variationText = productPriceId
        ? ` (variation: ${productPriceId})`
        : "";

      throw new BadRequest(
        `Insufficient quantity for product ${productId}${variationText} in source warehouse. Available: ${available}, Requested: ${quantity}`,
      );
    }
  }

  // =========================================================
  // Create transfer (بدون أي تغيير في الـ stock)
  // =========================================================
  const transfer = await TransferModel.create({
    fromWarehouseId,
    toWarehouseId,
    products: normalizedProducts,
    reason,
    status: "pending",
  });

  console.log("=== CREATE: TRANSFER CREATED (no stock change) ===", {
    transferId: transfer._id,
    reference: transfer.reference,
  });

  SuccessResponse(res, {
    message: "Transfer created successfully",
    transfer,
  });
};

// =========================================================
// GET TRANSFERS FOR WAREHOUSE
// =========================================================
export const getTransfersForWarehouse = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const transfers = await TransferModel.find({
    $or: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
  })
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  const pending = transfers.filter((t) => t.status === "pending");
  const received = transfers.filter((t) => t.status === "received");

  SuccessResponse(res, {
    message: "Transfers retrieved successfully",
    pending,
    received,
  });
};

// =========================================================
// GET TRANSFER BY ID
// =========================================================
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

// =========================================================
// UPDATE TRANSFER STATUS
// ✅ Accept → نقل الكمية (خصم من source + إضافة لـ destination)
// ✅ Reject → مفيش أي تغيير في الـ stock
// =========================================================
export const updateTransferStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    warehouseId,
    rejected_products = [],
    approved_products = [],
    reason,
  } = req.body;

  const transfer = await TransferModel.findById(id);
  if (!transfer) throw new NotFound("Transfer not found");

  if (transfer.status !== "pending")
    throw new BadRequest("Only pending transfers can be updated");

  if (transfer.toWarehouseId.toString() !== warehouseId)
    throw new BadRequest(
      "Only the receiving warehouse can update this transfer",
    );

  console.log("=== UPDATE: START ===", {
    transferId: id,
    warehouseId,
    approvedCount: approved_products.length,
    rejectedCount: rejected_products.length,
  });

  // =========================================================
  // Normalize approved products
  // =========================================================
  const normalizedApproved: NormalizedProduct[] = approved_products.map(
    (item: any): NormalizedProduct => {
      const pid = extractId(item.productId);
      const ppid = extractId(item.productPriceId);
      const quantity = Number(item.quantity);

      if (!pid || !quantity || quantity <= 0) {
        throw new BadRequest(
          "Each approved product must have productId and a positive quantity",
        );
      }

      return { productId: pid, productPriceId: ppid, quantity };
    },
  );

  // =========================================================
  // Validate approved products exist
  // =========================================================
  for (const item of normalizedApproved) {
    const { productId, productPriceId } = item;

    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFound(`Product ${productId} not found`);

    if (productPriceId) {
      const productPrice = await ProductPriceModel.findById(productPriceId);
      if (!productPrice) {
        throw new NotFound(`Product variation ${productPriceId} not found`);
      }
      if (productPrice.productId.toString() !== productId) {
        throw new BadRequest(
          `Product variation ${productPriceId} does not belong to product ${productId}`,
        );
      }
    }
  }

  // =========================================================
  // لو كله rejected → مفيش أي تغيير في الـ stock
  // =========================================================
  if (normalizedApproved.length === 0) {
    console.log("=== UPDATE: ALL REJECTED (no stock change) ===");

    if (rejected_products.length > 0) {
      transfer.rejected_products = rejected_products;
    }

    if (reason) {
      transfer.reason = reason;
    }

    transfer.status = "rejected";
    await transfer.save();

    return SuccessResponse(res, {
      message: "Transfer rejected successfully (no stock change)",
      transfer,
    });
  }

  // =========================================================
  // Move approved items: deduct from source + add to destination
  // =========================================================
  const deducted: NormalizedProduct[] = [];
  const addedToDestination: NormalizedProduct[] = [];

  try {
    for (const item of normalizedApproved) {
      const { productId, productPriceId, quantity } = item;

      // ✅ 1. اخصم من الـ source (مع التحقق)
      const deductResult = await Product_WarehouseModel.findOneAndUpdate(
        {
          productId,
          productPriceId: productPriceId || null,
          warehouseId: transfer.fromWarehouseId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true },
      );

      if (!deductResult) {
        const existing = await Product_WarehouseModel.findOne({
          productId,
          productPriceId: productPriceId || null,
          warehouseId: transfer.fromWarehouseId,
        });
        const available = existing?.quantity ?? 0;
        const variationText = productPriceId
          ? ` (variation: ${productPriceId})`
          : "";

        throw new BadRequest(
          `Insufficient quantity for product ${productId}${variationText} in source warehouse. Available: ${available}, Requested: ${quantity}`,
        );
      }

      deducted.push({
        productId,
        productPriceId: productPriceId || null,
        quantity,
      });

      // ✅ 2. ضيف للـ destination
      await Product_WarehouseModel.findOneAndUpdate(
        { productId, productPriceId: productPriceId || null, warehouseId },
        {
          $inc: { quantity },
          $setOnInsert: {
            productId,
            productPriceId: productPriceId || null,
            warehouseId,
          },
        },
        { upsert: true, new: true },
      );

      addedToDestination.push({
        productId,
        productPriceId: productPriceId || null,
        quantity,
      });

      console.log("=== UPDATE: MOVED ITEM ===", {
        productId,
        productPriceId,
        quantity,
        from: transfer.fromWarehouseId,
        to: warehouseId,
      });
    }
  } catch (err) {
    // ✅ Rollback product-level changes
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: transfer.fromWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }

    for (const a of addedToDestination) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: a.productId,
          productPriceId: a.productPriceId,
          warehouseId,
        },
        { $inc: { quantity: -a.quantity } },
      );
    }

    throw err;
  }

  // =========================================================
  // Warehouse totals: source - , destination +
  // =========================================================
  const totalMovedQty = deducted.reduce((acc, d) => acc + d.quantity, 0);

  try {
    if (totalMovedQty > 0) {
      await WarehouseModel.findByIdAndUpdate(transfer.fromWarehouseId, {
        $inc: { stock_Quantity: -totalMovedQty },
      });

      await WarehouseModel.findByIdAndUpdate(warehouseId, {
        $inc: { stock_Quantity: totalMovedQty },
      });
    }

    console.log("=== UPDATE: WAREHOUSE TOTALS UPDATED ===", {
      movedQty: totalMovedQty,
      sourceDecremented: totalMovedQty,
      destinationIncremented: totalMovedQty,
    });
  } catch (err) {
    // ✅ Rollback
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: transfer.fromWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }

    for (const a of addedToDestination) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: a.productId,
          productPriceId: a.productPriceId,
          warehouseId,
        },
        { $inc: { quantity: -a.quantity } },
      );
    }

    throw err;
  }

  // =========================================================
  // Update transfer document
  // =========================================================
  if (normalizedApproved.length > 0) {
    transfer.approved_products = normalizedApproved;
  }

  if (rejected_products.length > 0) {
    transfer.rejected_products = rejected_products;
  }

  if (reason) {
    transfer.reason = reason;
  }

  // ✅ لو فيه أي منتج approved → received
  // ✅ لو مفيش أي approved → rejected (بس مفيش stock change)
  transfer.status = normalizedApproved.length > 0 ? "received" : "rejected";
  await transfer.save();

  return SuccessResponse(res, {
    message: "Transfer status updated successfully",
    transfer,
  });
};

// =========================================================
// GET INCOMING / OUTGOING / ALL
// =========================================================
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
    received,
  });
};

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
    received,
  });
};

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
