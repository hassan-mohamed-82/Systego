import { Request, Response } from "express";
import { OrderModel } from "../../../models/schema/users/Order";
import { BadRequest, NotFound } from "../../../Errors";
import { SuccessResponse } from "../../../utils/response";
import { Product_WarehouseModel } from "../../../models/schema/admin/Product_Warehouse";
import { ProductPriceOptionModel } from "../../../models/schema/admin/product_price";

/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع
 */
export const getAllOnlineOrders = async (req: Request, res: Response) => {
  const { status } = req.query;

  const allowedStatuses = [
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
  ];
  const filter: any = { status: { $nin: ["pending", "rejected"] } };
  if (status && allowedStatuses.includes(status as string)) {
    filter.status = status;
  }

  const orders = await OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: "user", select: "_id name email phone" })
    .populate({ path: "paymentMethod", select: "_id name ar_name type" })
    .populate({ path: "warehouse", select: "_id name" })
    .populate({ path: "cartItems.product", select: "_id name image price" })
    .lean();

  // 1) Collect all variant ids across all orders
  const variantIds = [
    ...new Set(
      orders.flatMap((order: any) =>
        (order.cartItems || [])
          .map((item: any) => item.variant?.toString())
          .filter(Boolean)
      )
    ),
  ];

  // 2) Fetch options for those variants in ONE query
  const variantOptionsMap = new Map<string, string[]>();

  if (variantIds.length) {
    const productPriceOptions = await ProductPriceOptionModel.find({
      product_price_id: { $in: variantIds },
    })
      .populate({ path: "option_id", select: "name" })
      .lean();

    for (const ppo of productPriceOptions as any[]) {
      const key = ppo.product_price_id.toString();
      const optionName = ppo.option_id?.name;
      if (!optionName) continue;

      if (!variantOptionsMap.has(key)) variantOptionsMap.set(key, []);
      variantOptionsMap.get(key)!.push(optionName);
    }
  }

  // 3) Attach options + full display name to each cart item
  const ordersWithVariants = orders.map((order: any) => ({
    ...order,
    cartItems: (order.cartItems || []).map((item: any) => {
      const options = item.variant
        ? variantOptionsMap.get(item.variant.toString()) || []
        : [];

      const baseName = item.product?.name ?? "";

      return {
        ...item,
        options, // e.g. ["red"]
        product: item.product && {
          ...item.product,
          fullName: [baseName, ...options].join(" ").trim(), // "A22 model red"
        },
      };
    }),
  }));

  SuccessResponse(res, {
    message: "Online orders retrieved successfully",
    count: ordersWithVariants.length,
    orders: ordersWithVariants,
  });
};

/**
 * GET /admin/online-orders/:id
 * جلب تفاصيل أوردر أونلاين معين
 */
export const getOnlineOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await OrderModel.findById(id)
    .populate("user", "name email phone")
    .populate("paymentMethod", "name ar_name type")
    .populate("cartItems.product", "name image price");

  if (!order) throw new NotFound("Order not found");

  SuccessResponse(res, {
    message: "Order retrieved successfully",
    order,
  });
};

/**
 * PATCH /admin/online-orders/:id/status
 * تغيير حالة الأوردر (approved / rejected)
 */
const ALLOWED_STATUSES = [
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "returned",
  "failed_to_deliver",
  "canceled",
  "scheduled",
];

// statuses where the order's stock is currently deducted
const STOCK_DEDUCTED_STATUSES = [
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

type StockAction = "decrease" | "increase";

const getStockAction = (
  oldStatus: string,
  newStatus: string
): StockAction | null => {
  const wasDeducted = STOCK_DEDUCTED_STATUSES.includes(oldStatus);
  const willBeDeducted = STOCK_DEDUCTED_STATUSES.includes(newStatus);

  if (!wasDeducted && willBeDeducted) return "decrease";
  if (wasDeducted && !willBeDeducted) return "increase";
  return null;
};

const buildStockFilter = (order: any, item: any) => ({
  productId: item.product,
  productPriceId: item.variant ?? null, // variant = ProductPrice ref, null = base product
  warehouseId: order.warehouse,
});

const adjustOrderStock = async (order: any, action: StockAction) => {
  if (!order.warehouse) {
    throw new BadRequest(
      "Order has no warehouse assigned, cannot update stock"
    );
  }

  const sign = action === "decrease" ? -1 : 1;
  const applied: any[] = [];

  try {
    for (const item of order.cartItems) {
      const filter: any = buildStockFilter(order, item);

      // atomic guard: never let stock go below zero
      if (action === "decrease") filter.quantity = { $gte: item.quantity };

      const result = await Product_WarehouseModel.updateOne(filter, {
        $inc: { quantity: sign * item.quantity },
      });

      if (result.matchedCount === 0) {
        throw new BadRequest(
          action === "decrease"
            ? "Insufficient stock for one of the order items"
            : "Stock record not found for one of the order items"
        );
      }
      applied.push(item);
    }
  } catch (err) {
    // manual rollback of items already changed (no transactions)
    for (const item of applied) {
      await Product_WarehouseModel.updateOne(buildStockFilter(order, item), {
        $inc: { quantity: -sign * item.quantity },
      });
    }
    throw err;
  }
};

export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, statusDescription } = req.body;

  // pending and rejected are intentionally not allowed
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    throw new BadRequest("Invalid status.");
  }

  const existingOrder = await OrderModel.findById(id);
  if (!existingOrder) throw new NotFound("Order not found");

  const oldStatus = existingOrder.status;
  const oldDescription = existingOrder.statusDescription;

  // compare-and-set: prevents two concurrent requests from
  // both deducting/restoring the same order's stock
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, status: oldStatus },
    { status, statusDescription },
    { new: true }
  );
  if (!order) throw new BadRequest("Order was modified, please retry");

  const action = getStockAction(oldStatus, status);
  if (action) {
    try {
      await adjustOrderStock(order, action);
    } catch (err) {
      // stock update failed, restore the previous status
      await OrderModel.updateOne(
        { _id: id },
        { status: oldStatus, statusDescription: oldDescription }
      );
      throw err;
    }
  }

  await order.populate([
    { path: "user", select: "name email phone" },
    { path: "paymentMethod", select: "name ar_name type" },
  ]);

  SuccessResponse(res, {
    message: `Order status updated to ${status}`,
    order,
  });
};
