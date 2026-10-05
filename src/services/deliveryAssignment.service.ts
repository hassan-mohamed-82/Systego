// src/services/deliveryAssignment.service.ts
import mongoose from "mongoose";
import { OrderModel } from "../models/schema/users/Order";
import { DeliveryManModel } from "../models/schema/admin/deliveryMan";
import { WarehouseModel } from "../models/schema/admin/Warehouse";
import { ShippingSettingsModel } from "../models/schema/admin/ShippingSettings";
import { BadRequest } from "../Errors/BadRequest";

// ═══════════════════════════════════════════════════════════
// ⛔ Auto-assign DISABLED — Admin must assign manually
// ═══════════════════════════════════════════════════════════
export const autoAssignOrder = async (
  _orderId: string,
  _superadminId: string,
  _assignedBy?: string,
) => {
  return {
    assigned: false,
    reason:
      "Auto-assignment is disabled. Please assign a delivery man manually.",
  };
};

// ═══════════════════════════════════════════════════════════
// Manual assign — يدوي
// ═══════════════════════════════════════════════════════════
export const manualAssignOrder = async (
  orderId: string,
  deliveryManId: string,
  userId: string,
  notes?: string,
) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  const deliveryMan = await DeliveryManModel.findById(deliveryManId);
  if (!deliveryMan) throw new BadRequest("Delivery man not found");
  if (deliveryMan.status !== "active") {
    throw new BadRequest("Delivery man is not active");
  }

  // ✅ نتأكد إن المندوب مش كامل (maxConcurrentOrders = 10)
  const currentCount = (deliveryMan.currentOrders || []).length;
  const maxCount = deliveryMan.maxConcurrentOrders || 10;

  if (currentCount >= maxCount) {
    throw new BadRequest(
      `Delivery man is at maximum capacity (${currentCount}/${maxCount}).`,
    );
  }

  // ✅ لو الأوردر كان لمندوب تاني، نشيله من القديم
  const previousDeliveryManId = order.selfShipment?.deliveryManId;
  if (
    previousDeliveryManId &&
    previousDeliveryManId.toString() !== deliveryManId
  ) {
    await DeliveryManModel.findByIdAndUpdate(previousDeliveryManId, {
      $pull: { currentOrders: order._id },
    });
  }

  const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true });
  if (!onlineWarehouse) {
    throw new BadRequest("No online warehouse found");
  }

  const now = new Date();

  order.shipmentType = "self";
  order.selfShipment = {
    deliveryManId: deliveryMan._id,
    warehouseId: onlineWarehouse._id,
    status: "assigned",
    assignedAt: now,
    assignedBy: userId as any,
    assignmentType: "manual",
    pickedUpAt: order.selfShipment?.pickedUpAt || null,
    outForDeliveryAt: order.selfShipment?.outForDeliveryAt || null,
    deliveredAt: order.selfShipment?.deliveredAt || null,
    failedAt: order.selfShipment?.failedAt || null,
    returnedAt: order.selfShipment?.returnedAt || null,
    failureReason: order.selfShipment?.failureReason || "",
    deliveryNotes: notes || order.selfShipment?.deliveryNotes || "",
  } as any;

  if (!order.warehouse) {
    order.warehouse = onlineWarehouse._id;
  }

  // ✅ لو الأوردر لسه pending → نخليه processing
  if (order.status === "pending") {
    order.status = "processing";
  }

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: order.status,
    description: `Manually assigned to ${deliveryMan.name}${
      notes ? ` — ${notes}` : ""
    }`,
    source: "admin",
    updatedBy: userId as any,
    updatedAt: now,
  } as any);

  await order.save();

  await DeliveryManModel.findByIdAndUpdate(deliveryMan._id, {
    $addToSet: { currentOrders: order._id },
  });

  return {
    assigned: true,
    deliveryManId: deliveryMan._id,
    deliveryManName: deliveryMan.name,
    warehouseId: onlineWarehouse._id,
    warehouseName: onlineWarehouse.name,
  };
};

// ═══════════════════════════════════════════════════════════
// Unassign
// ═══════════════════════════════════════════════════════════
export const unassignOrder = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  const deliveryManId = order.selfShipment?.deliveryManId;
  if (!deliveryManId) {
    throw new BadRequest("Order is not assigned to a delivery man");
  }

  await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
    $pull: { currentOrders: order._id },
  });

  const now = new Date();

  order.shipmentType = null;
  order.selfShipment = {
    deliveryManId: null,
    warehouseId: order.selfShipment?.warehouseId || null,
    status: "unassigned",
    assignedAt: null,
    assignedBy: null,
    assignmentType: null,
    pickedUpAt: null,
    outForDeliveryAt: null,
    deliveredAt: null,
    failedAt: null,
    returnedAt: null,
    failureReason: "",
    deliveryNotes: "",
  } as any;

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: order.status,
    description: "Delivery man unassigned",
    source: "admin",
    updatedBy: null,
    updatedAt: now,
  } as any);

  await order.save();

  return { unassigned: true };
};

// ═══════════════════════════════════════════════════════════
// Update delivery status
// ═══════════════════════════════════════════════════════════
export const updateDeliveryStatus = async (
  orderId: string,
  newStatus:
    | "picked_up"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "returned",
  notes?: string,
  failureReason?: string,
) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  if (!order.selfShipment?.deliveryManId) {
    throw new BadRequest("Order is not assigned to a delivery man");
  }

  const deliveryManId = order.selfShipment.deliveryManId;
  const now = new Date();
  const prevOrderStatus = order.status;

  order.selfShipment.status = newStatus;
  order.selfShipment.deliveryNotes = notes || order.selfShipment.deliveryNotes;

  let newOrderStatus = order.status;

  if (newStatus === "picked_up") {
    order.selfShipment.pickedUpAt = now;
    newOrderStatus = "processing";
  } else if (newStatus === "out_for_delivery") {
    order.selfShipment.outForDeliveryAt = now;
    newOrderStatus = "out_for_delivery";
  } else if (newStatus === "delivered") {
    order.selfShipment.deliveredAt = now;
    newOrderStatus = "delivered";

    await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
      $pull: { currentOrders: order._id },
      $inc: { completedOrders: 1 },
    });
  } else if (newStatus === "failed") {
    order.selfShipment.failedAt = now;
    order.selfShipment.failureReason = failureReason || "";
    newOrderStatus = "failed_to_deliver";

    await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
      $pull: { currentOrders: order._id },
      $inc: { failedOrders: 1 },
    });
  } else if (newStatus === "returned") {
    order.selfShipment.returnedAt = now;
    newOrderStatus = "returned";

    await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
      $pull: { currentOrders: order._id },
    });
  }

  if (newOrderStatus !== prevOrderStatus) {
    order.status = newOrderStatus;

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: newOrderStatus,
      description:
        notes || failureReason || `Delivery status updated to ${newStatus}`,
      source: "delivery_man",
      updatedBy: deliveryManId as any,
      updatedAt: now,
    } as any);
  }

  await order.save();

  return {
    updated: true,
    status: newStatus,
    orderStatus: newOrderStatus,
  };
};
