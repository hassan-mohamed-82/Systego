import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound, UnauthorizedError } from "../../Errors/index";
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
// Move stock for an approved transfer
// (deduct from source + add to destination + warehouse totals)
// =========================================================
const moveTransferStock = async (
  transfer: any,
  approvedProducts: NormalizedProduct[],
): Promise<void> => {
  const sourceWarehouseId = transfer.fromWarehouseId;
  const destinationWarehouseId = transfer.toWarehouseId;

  const deducted: NormalizedProduct[] = [];
  const addedToDestination: NormalizedProduct[] = [];

  try {
    for (const item of approvedProducts) {
      const { productId, productPriceId, quantity } = item;

      // 1. Deduct from source (with availability check)
      const deductResult = await Product_WarehouseModel.findOneAndUpdate(
        {
          productId,
          productPriceId: productPriceId || null,
          warehouseId: sourceWarehouseId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true },
      );

      if (!deductResult) {
        const existing = await Product_WarehouseModel.findOne({
          productId,
          productPriceId: productPriceId || null,
          warehouseId: sourceWarehouseId,
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

      // 2. Add to destination
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId,
          productPriceId: productPriceId || null,
          warehouseId: destinationWarehouseId,
        },
        {
          $inc: { quantity },
          $setOnInsert: {
            productId,
            productPriceId: productPriceId || null,
            warehouseId: destinationWarehouseId,
          },
        },
        { upsert: true, new: true },
      );

      addedToDestination.push({
        productId,
        productPriceId: productPriceId || null,
        quantity,
      });
    }
  } catch (err) {
    // Rollback product-level changes
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: sourceWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }

    for (const a of addedToDestination) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: a.productId,
          productPriceId: a.productPriceId,
          warehouseId: destinationWarehouseId,
        },
        { $inc: { quantity: -a.quantity } },
      );
    }

    throw err;
  }

  // 3. Warehouse total counters
  const totalMovedQty = deducted.reduce((acc, d) => acc + d.quantity, 0);

  try {
    if (totalMovedQty > 0) {
      await WarehouseModel.findByIdAndUpdate(sourceWarehouseId, {
        $inc: { stock_Quantity: -totalMovedQty },
      });

      await WarehouseModel.findByIdAndUpdate(destinationWarehouseId, {
        $inc: { stock_Quantity: totalMovedQty },
      });
    }
  } catch (err) {
    // Rollback
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: sourceWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }

    for (const a of addedToDestination) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: a.productId,
          productPriceId: a.productPriceId,
          warehouseId: destinationWarehouseId,
        },
        { $inc: { quantity: -a.quantity } },
      );
    }

    throw err;
  }
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
  // Create transfer
  // السوبر أدمن بيعمل التحويل ويتقبل على طول (received)
  // باقي اليوزرز: pending لحد ما المخزن المستلم يوافق
  // =========================================================
  const isSuperAdmin = req.user?.role === "superadmin";

  const transfer = await TransferModel.create({
    fromWarehouseId,
    toWarehouseId,
    products: normalizedProducts,
    reason,
    status: isSuperAdmin ? "received" : "pending",
  });

  if (isSuperAdmin) {
    try {
      await moveTransferStock(transfer, normalizedProducts);
      transfer.approved_products = normalizedProducts as any;
      await transfer.save();
    } catch (err) {
      // لو حركة المخزون فشلت، امسح التحويل عشان ميفضلش معلّق
      await TransferModel.findByIdAndDelete(transfer._id);
      throw err;
    }
  }

  console.log(
    isSuperAdmin
      ? "=== CREATE: TRANSFER CREATED + RECEIVED (stock moved) ==="
      : "=== CREATE: TRANSFER CREATED (no stock change) ===",
    {
      transferId: transfer._id,
      reference: transfer.reference,
    },
  );

  SuccessResponse(res, {
    message: isSuperAdmin
      ? "Transfer created and received successfully"
      : "Transfer created successfully",
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

  // لو اليوزر مربوط بفرع/مخزن معيّن، مسموح يشوف التحويلات
  // اللي طرفها مخزنه (صادر أو وارد) بس
  const scopedWarehouseId =
    req.user?.role === "superadmin" ? null : req.user?.warehouse_id || null;

  if (scopedWarehouseId) {
    const fromWarehouse = transfer.fromWarehouseId as any;
    const toWarehouse = transfer.toWarehouseId as any;
    const fromId = String(fromWarehouse?._id || fromWarehouse || "");
    const toId = String(toWarehouse?._id || toWarehouse || "");

    if (fromId !== scopedWarehouseId && toId !== scopedWarehouseId) {
      throw new UnauthorizedError(
        "You are not allowed to access another warehouse",
      );
    }
  }

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
  // + warehouse totals (with rollback inside the helper)
  // =========================================================
  await moveTransferStock(transfer, normalizedApproved);

  // =========================================================
  // Update transfer document
  // =========================================================
  if (normalizedApproved.length > 0) {
    transfer.approved_products = normalizedApproved as any;
  }

  if (rejected_products.length > 0) {
    transfer.rejected_products = rejected_products as any;
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
  // لو اليوزر مربوط بمخزن، نرجّع بس التحويلات اللي طرفها مخزنه
  const scopedWarehouseId =
    req.user?.role === "superadmin" ? null : req.user?.warehouse_id || null;

  const filter = scopedWarehouseId
    ? {
        $or: [
          { fromWarehouseId: scopedWarehouseId },
          { toWarehouseId: scopedWarehouseId },
        ],
      }
    : {};

  const transfers = await TransferModel.find(filter)
    .populate("fromWarehouseId", "name")
    .populate("toWarehouseId", "name")
    .populate("products.productId", "name productCode")
    .populate("products.productPriceId", "price code");

  SuccessResponse(res, {
    message: "All transfers retrieved successfully",
    transfers,
  });
};
