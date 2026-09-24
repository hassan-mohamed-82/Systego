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
// Helper: مفتاح موحّد للـ product + variation
// =========================================================
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
// =========================================================
export const createTransfer = async (req: Request, res: Response) => {
  const { fromWarehouseId, toWarehouseId, products, reason } = req.body;

  // ---------- Validation ----------
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

  // ---------- Validate existence (no mutation yet) ----------
  for (const item of products) {
    const { productId, productPriceId, quantity } = item;

    if (!productId || !quantity || quantity <= 0)
      throw new BadRequest(
        "Each product must have productId and a positive quantity",
      );

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

  // ---------- Deduct from source (race-safe, with rollback) ----------
  const deducted: {
    productId: string;
    productPriceId: string | null;
    quantity: number;
  }[] = [];

  try {
    for (const item of products) {
      const { productId, productPriceId, quantity } = item;

      const result = await Product_WarehouseModel.findOneAndUpdate(
        {
          productId,
          productPriceId: productPriceId || null,
          warehouseId: fromWarehouseId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true },
      );

      if (!result) {
        const existing = await Product_WarehouseModel.findOne({
          productId,
          productPriceId: productPriceId || null,
          warehouseId: fromWarehouseId,
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
    }
  } catch (err) {
    // Rollback product-level deductions
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: fromWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }
    throw err;
  }

  const totalQty = products.reduce(
    (acc: number, item: any) => acc + Number(item.quantity),
    0,
  );

  // ---------- Decrement source warehouse total (with rollback on failure) ----------
  try {
    await WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
      $inc: { stock_Quantity: -totalQty },
    });
  } catch (err) {
    // Rollback product-level deductions if total decrement fails
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: fromWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }
    throw err;
  }

  // ---------- Create transfer (pending) ----------
  try {
    const transfer = await TransferModel.create({
      fromWarehouseId,
      toWarehouseId,
      products,
      reason,
      status: "pending",
    });

    SuccessResponse(res, {
      message: "Transfer created successfully",
      transfer,
    });
  } catch (err) {
    // Rollback everything if transfer creation fails
    for (const d of deducted) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: d.productId,
          productPriceId: d.productPriceId,
          warehouseId: fromWarehouseId,
        },
        { $inc: { quantity: d.quantity } },
      );
    }

    await WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
      $inc: { stock_Quantity: totalQty },
    });

    throw err;
  }
};

// =========================================================
// GET TRANSFERS FOR WAREHOUSE (in + out)
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
// UPDATE TRANSFER STATUS (Accept / Reject)
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

  // =========================================================
  // Reconcile: كل وحدة اتبعتت لازم تنتهي approved أو rejected
  // =========================================================
  const sentByKey = new Map<string, number>();
  for (const item of transfer.products as any[]) {
    const k = keyOf(
      item.productId.toString(),
      item.productPriceId ? item.productPriceId.toString() : null,
    );
    sentByKey.set(k, (sentByKey.get(k) || 0) + item.quantity);
  }

  const accountedByKey = new Map<string, number>();

  // =========================================================
  // Approved items → add to destination
  // =========================================================
  const addedToDestination: {
    productId: string;
    productPriceId: string | null;
    quantity: number;
  }[] = [];

  try {
    for (const item of approved_products) {
      const { productId, productPriceId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        throw new BadRequest(
          "Each approved product must have productId and a positive quantity",
        );
      }

      // Validate product exists
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
        quantity: Number(quantity),
      });

      const k = keyOf(productId, productPriceId || null);
      accountedByKey.set(k, (accountedByKey.get(k) || 0) + Number(quantity));
    }
  } catch (err) {
    // Rollback destination additions
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
  // Rejected items (explicit)
  // =========================================================
  for (const item of rejected_products) {
    const { productId, productPriceId, quantity } = item;
    const k = keyOf(productId, productPriceId || null);
    accountedByKey.set(k, (accountedByKey.get(k) || 0) + Number(quantity || 0));
  }

  // =========================================================
  // Return unaccounted / rejected quantity back to source
  // =========================================================
  const returnedToSource: {
    productId: string;
    productPriceId: string | null;
    quantity: number;
  }[] = [];

  let totalReturnedQty = 0;

  try {
    for (const [k, sentQty] of sentByKey.entries()) {
      const accountedQty = accountedByKey.get(k) || 0;
      const toReturn = sentQty - accountedQty;

      if (toReturn > 0) {
        const { productId, productPriceId } = parseKey(k);

        await Product_WarehouseModel.findOneAndUpdate(
          { productId, productPriceId, warehouseId: transfer.fromWarehouseId },
          {
            $inc: { quantity: toReturn },
            $setOnInsert: {
              productId,
              productPriceId,
              warehouseId: transfer.fromWarehouseId,
            },
          },
          { upsert: true, new: true },
        );

        returnedToSource.push({
          productId,
          productPriceId,
          quantity: toReturn,
        });
        totalReturnedQty += toReturn;
      }
    }
  } catch (err) {
    // Rollback destination additions AND source returns
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

    for (const r of returnedToSource) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: r.productId,
          productPriceId: r.productPriceId,
          warehouseId: transfer.fromWarehouseId,
        },
        { $inc: { quantity: -r.quantity } },
      );
    }

    throw err;
  }

  // =========================================================
  // Warehouse totals update
  // =========================================================
  const totalApprovedQty = approved_products.reduce(
    (acc: number, item: any) => acc + Number(item.quantity),
    0,
  );

  try {
    if (totalApprovedQty > 0) {
      await WarehouseModel.findByIdAndUpdate(warehouseId, {
        $inc: { stock_Quantity: totalApprovedQty },
      });
    }

    if (totalReturnedQty > 0) {
      await WarehouseModel.findByIdAndUpdate(transfer.fromWarehouseId, {
        $inc: { stock_Quantity: totalReturnedQty },
      });
    }
  } catch (err) {
    // Rollback everything
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

    for (const r of returnedToSource) {
      await Product_WarehouseModel.findOneAndUpdate(
        {
          productId: r.productId,
          productPriceId: r.productPriceId,
          warehouseId: transfer.fromWarehouseId,
        },
        { $inc: { quantity: -r.quantity } },
      );
    }

    throw err;
  }

  // =========================================================
  // Update transfer document
  // =========================================================
  if (approved_products.length > 0) {
    transfer.approved_products = approved_products;
  }

  if (rejected_products.length > 0) {
    transfer.rejected_products = rejected_products;
  }

  if (reason) {
    transfer.reason = reason;
  }

  transfer.status = approved_products.length > 0 ? "received" : "rejected";
  await transfer.save();

  return SuccessResponse(res, {
    message: "Transfer status updated successfully",
    transfer,
  });
};

// =========================================================
// GET INCOMING TRANSFERS
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

// =========================================================
// GET OUTGOING TRANSFERS
// =========================================================
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

// =========================================================
// GET ALL TRANSFERS
// =========================================================
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
