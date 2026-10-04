// src/services/deliveryAssignment.service.ts
import mongoose from "mongoose";
import { OrderModel } from "../models/schema/users/Order";
import { DeliveryManModel } from "../models/schema/admin/deliveryMan";
import { WarehouseModel } from "../models/schema/admin/Warehouse";
import { ShippingSettingsModel } from "../models/schema/admin/ShippingSettings";
import { BadRequest } from "../Errors/BadRequest";

// ═══════════════════════════════════════════════════════════
// Auto-assign order to a delivery man
// ═══════════════════════════════════════════════════════════
export const autoAssignOrder = async (
  orderId: string,
  superadminId: string,
  assignedBy?: string,
) => {
  // ✅ 1) نجيب الأوردر أولاً
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  // ✅ 2) لو الأوردر مش delivery، منسيبوش
  if (order.orderType !== "delivery") {
    return { assigned: false, reason: "Order is not a delivery order" };
  }

  // ✅ 3) نشيك على shippingMethod الأوردر أولاً
  if ((order as any).shippingMethod === "bosta") {
    return {
      assigned: false,
      reason: "Order is set to bosta shipping — skip self assignment",
    };
  }

  // ✅ 4) لو الأوردر ملهوش shippingMethod محدد، نشيك على activeMethod في الـ settings
  if (!(order as any).shippingMethod) {
    const settings = await ShippingSettingsModel.findOne({ superadminId });
    if (!settings || settings.activeMethod !== "self") {
      return { assigned: false, reason: "Self shipping is not active" };
    }
  }

  // ✅ 5) لو الأوردر اتوزّع قبل كده
  if (
    order.selfShipment?.deliveryManId &&
    order.selfShipment.status !== "unassigned"
  ) {
    return { assigned: false, reason: "Order already assigned" };
  }

  // ✅ 6) نجيب الفرع الأونلاين
  const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true });
  if (!onlineWarehouse) {
    return { assigned: false, reason: "No online warehouse found" };
  }

  // ✅ 7) نجيب مندوب متاح — مع $ifNull لحماية المندوبين القدام
  const availableDeliveryMen = await DeliveryManModel.find({
    status: "active",
    $expr: {
      $lt: [
        { $size: { $ifNull: ["$currentOrders", []] } },
        { $ifNull: ["$maxConcurrentOrders", 10] },
      ],
    },
  })
    .sort({ "currentOrders.length": 1, completedOrders: -1 })
    .limit(1);

  if (!availableDeliveryMen.length) {
    return { assigned: false, reason: "No available delivery man" };
  }

  const deliveryMan = availableDeliveryMen[0];

  // ✅ 8) نحدّث الأوردر
  order.shipmentType = "self";
  order.selfShipment = {
    deliveryManId: deliveryMan._id,
    warehouseId: onlineWarehouse._id,
    status: "assigned",
    assignedAt: new Date(),
    assignedBy: assignedBy || null,
    assignmentType: "auto",
    pickedUpAt: null,
    outForDeliveryAt: null,
    deliveredAt: null,
    failedAt: null,
    failureReason: "",
    deliveryNotes: "",
  } as any;

  // ✅ 9) نحدّث الـ warehouse كـ default
  if (!order.warehouse) {
    order.warehouse = onlineWarehouse._id;
  }

  await order.save();

  // ✅ 10) نضيف الأوردر لـ مندوب
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
// Manual assign — يدوي
// ═══════════════════════════════════════════════════════════
export const manualAssignOrder = async (
  orderId: string,
  deliveryManId: string,
  userId: string,
  notes?: string,
) => {
  // ✅ 1) نجيب الأوردر
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  // ✅ 2) نجيب المندوب
  const deliveryMan = await DeliveryManModel.findById(deliveryManId);
  if (!deliveryMan) throw new BadRequest("Delivery man not found");
  if (deliveryMan.status !== "active") {
    throw new BadRequest("Delivery man is not active");
  }

  // ✅ 3) لو الأوردر كان لمندوب تاني، نشيله من القديم
  const previousDeliveryManId = order.selfShipment?.deliveryManId;
  if (
    previousDeliveryManId &&
    previousDeliveryManId.toString() !== deliveryManId
  ) {
    await DeliveryManModel.findByIdAndUpdate(previousDeliveryManId, {
      $pull: { currentOrders: order._id },
    });
  }

  // ✅ 4) نجيب الفرع الأونلاين
  const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true });
  if (!onlineWarehouse) {
    throw new BadRequest("No online warehouse found");
  }

  // ✅ 5) نحدّث الأوردر
  order.shipmentType = "self";
  order.selfShipment = {
    deliveryManId: deliveryMan._id,
    warehouseId: onlineWarehouse._id,
    status: "assigned",
    assignedAt: new Date(),
    assignedBy: userId as any,
    assignmentType: "manual",
    pickedUpAt: order.selfShipment?.pickedUpAt || null,
    outForDeliveryAt: order.selfShipment?.outForDeliveryAt || null,
    deliveredAt: order.selfShipment?.deliveredAt || null,
    failedAt: order.selfShipment?.failedAt || null,
    failureReason: order.selfShipment?.failureReason || "",
    deliveryNotes: notes || order.selfShipment?.deliveryNotes || "",
  } as any;

  if (!order.warehouse) {
    order.warehouse = onlineWarehouse._id;
  }

  await order.save();

  // ✅ 6) نضيف الأوردر لـ مندوب
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
// Unassign — يشيل المندوب
// ═══════════════════════════════════════════════════════════
export const unassignOrder = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new BadRequest("Order not found");

  const deliveryManId = order.selfShipment?.deliveryManId;
  if (!deliveryManId) {
    throw new BadRequest("Order is not assigned to a delivery man");
  }

  // ✅ نشيل من المندوب
  await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
    $pull: { currentOrders: order._id },
  });

  // ✅ نصفّر الـ selfShipment
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
    failureReason: "",
    deliveryNotes: "",
  } as any;

  await order.save();

  return { unassigned: true };
};

// ═══════════════════════════════════════════════════════════
// Update delivery status
// ═══════════════════════════════════════════════════════════
export const updateDeliveryStatus = async (
  orderId: string,
  newStatus: "picked_up" | "out_for_delivery" | "delivered" | "failed",
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

  // ✅ نحدّث الـ selfShipment
  order.selfShipment.status = newStatus;
  order.selfShipment.deliveryNotes = notes || order.selfShipment.deliveryNotes;

  // ✅ نحدّد الـ order.status الجديد
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
  }

  // ✅ نحدّث order.status + statusHistory
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
