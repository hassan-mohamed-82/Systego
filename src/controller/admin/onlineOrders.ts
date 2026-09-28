import { Request, Response } from "express";
import { OrderModel } from "../../models/schema/users/Order";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { ProductPriceOptionModel } from "../../models/schema/admin/product_price"; // adjust path

/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع والمخزن والمنتجات
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
  const filter: any = {};

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
    .populate({
      path: "user",
      select: "_id name email phone",
    })
    .populate({
      path: "paymentMethod",
      select: "_id name ar_name type",
    })
    .populate({
      path: "warehouse",
      select: "_id name",
    })
    .populate({
      path: "cartItems.product",
      select: "_id name image price",
    })
    .lean();

  if (!order) throw new NotFound("Order not found");

  SuccessResponse(res, {
    message: "Order retrieved successfully",
    order,
  });
};

/**
 * PATCH /admin/online-orders/:id/status
 * تغيير حالة الأوردر
 */
export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, statusDescription } = req.body;

  const allowedStatuses = [
    "pending",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed_to_deliver",
    "canceled",
    "scheduled",
  ];

  if (!status || !allowedStatuses.includes(status)) {
    throw new NotFound("Invalid status.");
  }

  // تحديث الأوردر وإرجاع النسخة المعدلة مع الـ populate
  const order = await OrderModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        statusDescription,
      },
    },
    { new: true }, // يرجع الدوكيومنت بعد التعديل
  )
    .populate({
      path: "user",
      select: "_id name email phone",
    })
    .populate({
      path: "paymentMethod",
      select: "_id name ar_name type",
    })
    .lean();

  if (!order) {
    throw new NotFound("Order not found");
  }

  SuccessResponse(res, {
    message: `Order status updated to ${status}`,
    order,
  });
};
