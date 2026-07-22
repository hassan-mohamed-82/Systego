import { Request, Response } from "express";
import { OrderModel } from "../../models/schema/users/Order";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";

/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع
 */
export const getAllOnlineOrders = async (req: Request, res: Response) => {
  const { status } = req.query;

  const filter: any = {};
  if (
    status &&
    ["pending", "approved", "rejected"].includes(status as string)
  ) {
    filter.status = status;
  }

  const orders = await OrderModel.find(filter)
    .populate("user", "name email phone")
    .populate("paymentMethod", "name ar_name type")
    .populate("cartItems.product", "name image price")
    .sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Online orders retrieved successfully",
    count: orders.length,
    orders,
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
export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, statusDescription } = req.body;

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    throw new NotFound(
      "Invalid status. Must be: pending, approved, or rejected"
    );
  }

  const existingOrder = await OrderModel.findById(id);
  if (!existingOrder) throw new NotFound("Order not found");

  const isNewlyRejected =
    status === "rejected" && existingOrder.status !== "rejected";

  const order = await OrderModel.findByIdAndUpdate(
    id,
    { status, statusDescription },
    { new: true }
  )
    .populate("user", "name email phone")
    .populate("paymentMethod", "name ar_name type");

  if (!order) throw new NotFound("Order not found");

  if (isNewlyRejected) {
    await restoreStockForOrder(order);
  }

  SuccessResponse(res, {
    message: `Order status updated to ${status}`,
    order,
  });
};

async function restoreStockForOrder(order: any) {
  if (!order.warehouse || !order.cartItems?.length) return;

  const bulkOps = order.cartItems.map((item: any) => ({
    updateOne: {
      filter: {
        productId: item.product,
        productPriceId: item.variant || null,
        warehouseId: order.warehouse,
      },
      update: { $inc: { quantity: item.quantity } },
    },
  }));

  if (bulkOps.length > 0) {
    await Product_WarehouseModel.bulkWrite(bulkOps);
  }
}
