// src/controller/admin/DeliveryAssignment.ts
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { OrderModel } from "../../models/schema/users/Order";
import { DeliveryManModel } from "../../models/schema/admin/deliveryMan";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { getSuperadminId } from "../../utils/shipping/getSuperadminId";
import {
  autoAssignOrder,
  manualAssignOrder,
  unassignOrder,
  updateDeliveryStatus,
} from "../../services/deliveryAssignment.service";

// ═══════════════════════════════════════════════════════════
// AUTO ASSIGN
// ═══════════════════════════════════════════════════════════
export const autoAssign = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const { orderId } = req.params;
  const userId = (req.user as any)?.id;

  const result = await autoAssignOrder(orderId, superadminId, userId);

  if (!result.assigned) {
    return SuccessResponse(res, {
      message: `Auto-assignment skipped: ${result.reason}`,
      result,
    });
  }

  SuccessResponse(res, {
    message: "✅ Order auto-assigned to delivery man",
    result,
  });
};

// ═══════════════════════════════════════════════════════════
// MANUAL ASSIGN
// ═══════════════════════════════════════════════════════════
export const manualAssign = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id;
  const { orderId } = req.params;
  const { delivery_man_id, notes } = req.body;

  if (!delivery_man_id) {
    throw new BadRequest("delivery_man_id is required");
  }

  const result = await manualAssignOrder(
    orderId,
    delivery_man_id,
    userId,
    notes,
  );

  SuccessResponse(res, {
    message: "✅ Order assigned to delivery man successfully",
    result,
  });
};

// ═══════════════════════════════════════════════════════════
// UNASSIGN
// ═══════════════════════════════════════════════════════════
export const unassign = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await unassignOrder(orderId);

  SuccessResponse(res, {
    message: "✅ Delivery man removed from order",
    result,
  });
};

// ═══════════════════════════════════════════════════════════
// UPDATE STATUS
// ═══════════════════════════════════════════════════════════
export const updateStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, notes, failure_reason } = req.body;

  if (!status) throw new BadRequest("status is required");

  const allowed = ["picked_up", "out_for_delivery", "delivered", "failed"];
  if (!allowed.includes(status)) {
    throw new BadRequest(`status must be one of: ${allowed.join(", ")}`);
  }

  const result = await updateDeliveryStatus(
    orderId,
    status,
    notes,
    failure_reason,
  );

  SuccessResponse(res, {
    message: `✅ Delivery status updated to ${status}`,
    result,
  });
};

// ═══════════════════════════════════════════════════════════
// GET AVAILABLE DELIVERY MEN
// ═══════════════════════════════════════════════════════════
export const getAvailableDeliveryMen = async (req: Request, res: Response) => {
  // ✅ $ifNull عشان المندوبين القدام
  const deliveryMen = await DeliveryManModel.find({
    status: "active",
    $expr: {
      $lt: [
        { $size: { $ifNull: ["$currentOrders", []] } },
        { $ifNull: ["$maxConcurrentOrders", 10] },
      ],
    },
  })
    .select("-password")
    .sort({ "currentOrders.length": 1, completedOrders: -1 });

  // ✅ نضيف info عن الفرع الأونلاين
  const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true });

  SuccessResponse(res, {
    message: "Available delivery men fetched successfully",
    count: deliveryMen.length,
    onlineWarehouse: onlineWarehouse
      ? {
          _id: onlineWarehouse._id,
          name: onlineWarehouse.name,
          address: onlineWarehouse.address,
        }
      : null,
    deliveryMen,
  });
};

// ═══════════════════════════════════════════════════════════
// GET DELIVERY MAN ORDERS
// ═══════════════════════════════════════════════════════════
export const getDeliveryManOrders = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deliveryMan = await DeliveryManModel.findById(id)
    .select("-password")
    .populate({
      path: "currentOrders",
      select: "reference status totalOrderPrice shippingAddress createdAt",
    });

  if (!deliveryMan) {
    throw new BadRequest("Delivery man not found");
  }

  SuccessResponse(res, {
    message: "Delivery man orders fetched successfully",
    deliveryMan,
  });
};

// ═══════════════════════════════════════════════════════════
// GET ORDER DELIVERY INFO
// ═══════════════════════════════════════════════════════════
export const getOrderDeliveryInfo = async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const order = await OrderModel.findById(orderId)
    .select("reference status selfShipment shipmentType warehouse")
    .populate("selfShipment.deliveryManId", "name phone_number photo")
    .populate("selfShipment.warehouseId", "name address phone")
    .populate("warehouse", "name address phone");

  if (!order) {
    throw new BadRequest("Order not found");
  }

  SuccessResponse(res, {
    message: "Order delivery info fetched successfully",
    order,
  });
};
