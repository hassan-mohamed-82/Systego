// src/controller/admin/onlineOrders.js
import { Request, Response } from "express";
import { OrderModel } from "../../models/schema/users/Order";
import { BostaShipmentModel } from "../../models/schema/admin/BostaShipment";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { UserModel } from "../../models/schema/admin/User";
import { DeliveryManModel } from "../../models/schema/admin/deliveryMan";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { autoAssignOrder } from "../../services/deliveryAssignment.service";
import { getBostaCreds } from "../../utils/shipping/getBostaCreds";
import bostaService from "../../services/bosta.service";

// ═══════════════════════════════════════════════════════════
// 🎯 MAPPING — selfShipment.status ← order.status
// ═══════════════════════════════════════════════════════════
const SELF_TO_ORDER_STATUS: Record<string, string> = {
  unassigned: "pending",
  assigned: "processing",
  picked_up: "processing",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  failed: "failed_to_deliver",
};

// ═══════════════════════════════════════════════════════════
// 🎯 MAPPING — bostaShipment.status ← order.status
// ═══════════════════════════════════════════════════════════
const BOSTA_TO_ORDER_STATUS: Record<string, string> = {
  PendingPickup: "pending",
  "Pickup requested": "processing",
  "Picked up": "processing",
  "In transit": "out_for_delivery",
  "Out for delivery": "out_for_delivery",
  Delivered: "delivered",
  Cancelled: "canceled",
  "Failed to deliver": "failed_to_deliver",
  Returned: "returned",
};

// ═══════════════════════════════════════════════════════════
// ✅ ALLOWED STATUSES — self + bosta
// ═══════════════════════════════════════════════════════════
const SELF_ALLOWED = [
  "unassigned",
  "assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "failed",
];

const BOSTA_ALLOWED = [
  "PendingPickup",
  "Pickup requested",
  "Picked up",
  "In transit",
  "Out for delivery",
  "Delivered",
  "Cancelled",
  "Failed to deliver",
  "Returned",
];

/**
 * GET /admin/online-orders
 */
export const getAllOnlineOrders = async (req: Request, res: Response) => {
  const { status, shippingMethod } = req.query;

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

  const filter: any = {};

  if (status && allowedStatuses.includes(status as string)) {
    filter.status = status;
  }

  if (shippingMethod && ["self", "bosta"].includes(shippingMethod as string)) {
    filter.shipmentType = shippingMethod;
  }

  // ✅ نجيب activeMethod
  let activeMethod = "self";
  try {
    const superadminUser = await UserModel.findOne({ role: "superadmin" })
      .select("_id")
      .lean();

    if (superadminUser) {
      const settings = await ShippingSettingsModel.findOne({
        superadminId: (superadminUser as any)._id,
      })
        .select("activeMethod")
        .lean();

      if (settings?.activeMethod) activeMethod = settings.activeMethod;
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch activeMethod:", err);
  }

  const orders = await OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: "user", select: "_id name email phone" })
    .populate({ path: "paymentMethod", select: "_id name ar_name type" })
    .populate({ path: "warehouse", select: "_id name" })
    .populate({ path: "cartItems.product", select: "_id name image price" })
    .populate({
      path: "selfShipment.deliveryManId",
      select: "_id name phone_number",
    })
    .populate({
      path: "selfShipment.warehouseId",
      select: "_id name address",
    })
    .select("+shippingMethod +shipmentType +selfShipment")
    .lean();

  // 1) Variant ids
  const variantIds = [
    ...new Set(
      orders.flatMap((order: any) =>
        (order.cartItems || [])
          .map((item: any) => item.variant?.toString())
          .filter(Boolean),
      ),
    ),
  ];

  // 2) Variant options
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

  // 3) Attach options
  const ordersWithVariants = orders.map((order: any) => ({
    ...order,
    cartItems: (order.cartItems || []).map((item: any) => {
      const options = item.variant
        ? variantOptionsMap.get(item.variant.toString()) || []
        : [];

      const baseName = item.product?.name ?? "";

      return {
        ...item,
        options,
        product: item.product && {
          ...item.product,
          fullName: [baseName, ...options].join(" ").trim(),
        },
      };
    }),
  }));

  // 4) Bosta shipments
  const bostaOrderIds = orders
    .filter(
      (o: any) => o.shippingMethod === "bosta" || o.shipmentType === "bosta",
    )
    .map((o: any) => o._id.toString());

  const bostaShipmentsMap = new Map<string, any>();

  if (bostaOrderIds.length) {
    const bostaShipments = await BostaShipmentModel.find({
      relatedModel: "Order",
      relatedId: { $in: bostaOrderIds },
      type: 10,
    })
      .select(
        "relatedId trackingNumber status deliveryId awb labelUrl cod shippingCost",
      )
      .lean();

    for (const s of bostaShipments as any[]) {
      bostaShipmentsMap.set(s.relatedId.toString(), s);
    }
  }

  SuccessResponse(res, {
    message: "Online orders retrieved successfully",
    count: ordersWithVariants.length,
    activeMethod,
    orders: ordersWithVariants.map((o: any) => ({
      ...o,
      bostaShipment: bostaShipmentsMap.get(o._id.toString()) || null,
    })),
  });
};

/**
 * GET /admin/online-orders/:id
 */
export const getOnlineOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await OrderModel.findById(id)
    .populate({ path: "user", select: "_id name email phone" })
    .populate({ path: "paymentMethod", select: "_id name ar_name type" })
    .populate({ path: "warehouse", select: "_id name" })
    .populate({ path: "cartItems.product", select: "_id name image price" })
    .populate({
      path: "selfShipment.deliveryManId",
      select: "_id name phone_number",
    })
    .populate({
      path: "selfShipment.warehouseId",
      select: "_id name address",
    })
    .lean();

  if (!order) throw new NotFound("Order not found");

  let bostaShipment = null;
  if (
    (order as any).shippingMethod === "bosta" ||
    (order as any).shipmentType === "bosta"
  ) {
    bostaShipment = await BostaShipmentModel.findOne({
      relatedModel: "Order",
      relatedId: id,
      type: 10,
    }).lean();
  }

  SuccessResponse(res, {
    message: "Order retrieved successfully",
    order: { ...(order as any), bostaShipment },
  });
};

/**
 * PATCH /admin/online-orders/:id/status
 *
 * 🎯 الموحّد: يحدّث selfShipment.status / bostaShipment.status + order.status
 */
export const updateOnlineOrderStatus = async (req: Request, res: Response) => {
  const adminId = (req.user as any)?.id;
  const { id } = req.params;
  const { status, statusDescription } = req.body;

  if (!status) {
    throw new BadRequest("status is required");
  }

  const order = await OrderModel.findById(id);
  if (!order) throw new NotFound("Order not found");

  const method = (order as any).shippingMethod || (order as any).shipmentType;

  if (!method) {
    throw new BadRequest("Order has no shipping method. Cannot update status.");
  }

  const now = new Date();
  const prevOrderStatus = order.status;
  let newOrderStatus = order.status;

  // ═══════════════════════════════════════════════════════════
  // 👤 SELF
  // ═══════════════════════════════════════════════════════════
  if (method === "self") {
    if (!SELF_ALLOWED.includes(status)) {
      throw new BadRequest(
        `Invalid self status. Allowed: ${SELF_ALLOWED.join(", ")}`,
      );
    }

    if (!order.selfShipment?.deliveryManId) {
      throw new BadRequest(
        "Order has no delivery man assigned. Assign one first.",
      );
    }

    const deliveryManId = order.selfShipment.deliveryManId;

    // ✅ حدّث selfShipment.status
    order.selfShipment.status = status;

    if (statusDescription) {
      order.selfShipment.deliveryNotes = statusDescription;
    }

    // ✅ Timestamps
    if (status === "picked_up") order.selfShipment.pickedUpAt = now;
    if (status === "out_for_delivery")
      order.selfShipment.outForDeliveryAt = now;
    if (status === "delivered") order.selfShipment.deliveredAt = now;
    if (status === "failed") {
      order.selfShipment.failedAt = now;
      order.selfShipment.failureReason = statusDescription || "";
    }

    // ✅ إحصائيات المندوب
    if (status === "delivered" || status === "failed") {
      await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
        $pull: { currentOrders: order._id },
        $inc:
          status === "delivered" ? { completedOrders: 1 } : { failedOrders: 1 },
      });
    }

    // ✅ order.status حسب الـ mapping
    newOrderStatus = SELF_TO_ORDER_STATUS[status] || order.status;
  }
  // ═══════════════════════════════════════════════════════════
  // 🚚 BOSTA
  // ═══════════════════════════════════════════════════════════
  else if (method === "bosta") {
    if (!BOSTA_ALLOWED.includes(status)) {
      throw new BadRequest(
        `Invalid bosta status. Allowed: ${BOSTA_ALLOWED.join(", ")}`,
      );
    }

    if (!(order as any).bostaShipment) {
      throw new BadRequest(
        "Order has no Bosta shipment yet. Create a shipment first.",
      );
    }

    const shipment = await BostaShipmentModel.findById(
      (order as any).bostaShipment,
    );
    if (!shipment) {
      throw new BadRequest("Bosta shipment record not found");
    }

    // ✅ حدّث bostaShipment.status
    shipment.status = status;
    shipment.lastSyncAt = now;

    // ✅ نضيف snapshot للـ history
    shipment.trackingHistory = shipment.trackingHistory || [];
    shipment.trackingHistory.push({
      status,
      statusCode: shipment.statusCode,
      snapshotAt: now,
      data: { source: "admin_manual", description: statusDescription || "" },
    } as any);

    await shipment.save();

    // ✅ order.status حسب الـ mapping
    newOrderStatus = BOSTA_TO_ORDER_STATUS[status] || order.status;
  }

  // ═══════════════════════════════════════════════════════════
  // 📝 order.status + statusDescription + statusHistory
  // ═══════════════════════════════════════════════════════════
  order.status = newOrderStatus;

  if (statusDescription) {
    order.statusDescription = statusDescription;
  }

  if (order.status !== prevOrderStatus) {
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.status,
      description:
        statusDescription ||
        `${method === "bosta" ? "Bosta" : "Self"} status: ${status}`,
      source: method === "bosta" ? "bosta" : "admin",
      updatedBy: adminId || null,
      updatedAt: now,
    } as any);
  }

  await order.save();

  // ✅ نرجّع الأوردر populated
  const populated = await OrderModel.findById(id)
    .populate({ path: "user", select: "_id name email phone" })
    .populate({ path: "paymentMethod", select: "_id name ar_name type" })
    .populate({
      path: "selfShipment.deliveryManId",
      select: "_id name phone_number",
    })
    .lean();

  let bostaShipment = null;
  if (method === "bosta") {
    bostaShipment = await BostaShipmentModel.findOne({
      relatedModel: "Order",
      relatedId: id,
      type: 10,
    })
      .select("-trackingHistory -rawResponse")
      .lean();
  }

  SuccessResponse(res, {
    message: `✅ Order status updated to ${newOrderStatus}`,
    order: {
      ...(populated as any),
      bostaShipment,
    },
  });
};

/**
 * 🚀 POST /admin/online-orders/bulk-create-shipments
 * Bulk create shipments for both Self + Bosta
 */
export const bulkCreateShipments = async (req: Request, res: Response) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    throw new BadRequest("order_ids is required and cannot be empty");
  }

  if (order_ids.length > 50) {
    throw new BadRequest("Maximum 50 orders per bulk request");
  }

  // ✅ superadminId + settings
  const superadminUser = await UserModel.findOne({ role: "superadmin" })
    .select("_id")
    .lean();

  if (!superadminUser) {
    throw new BadRequest("Superadmin not found");
  }

  const superadminId = (superadminUser as any)._id.toString();
  const settings = await ShippingSettingsModel.findOne({ superadminId });

  // ✅ نجيب الأوردرات
  const orders = await OrderModel.find({ _id: { $in: order_ids } });

  if (orders.length === 0) {
    throw new BadRequest("No orders found");
  }

  const results = {
    total: orders.length,
    self: { assigned: 0, failed: 0, errors: [] as any[] },
    bosta: {
      created: 0,
      failed: 0,
      shipments: [] as any[],
      errors: [] as any[],
    },
  };

  // ═══════════════════════════════════════════════════════════
  // 🅰️ SELF — auto assign
  // ═══════════════════════════════════════════════════════════
  const selfOrders = orders.filter(
    (o) => o.shipmentType === "self" && !o.selfShipment?.deliveryManId,
  );

  for (const order of selfOrders) {
    try {
      const result = await autoAssignOrder(
        order._id.toString(),
        superadminId,
        (req.user as any)?.id,
      );

      if (result.assigned) {
        results.self.assigned++;
      } else {
        results.self.failed++;
        results.self.errors.push({
          order_id: order._id.toString(),
          reference: order.reference,
          error: result.reason || "Assignment failed",
        });
      }
    } catch (err: any) {
      results.self.failed++;
      results.self.errors.push({
        order_id: order._id.toString(),
        reference: order.reference,
        error: err.message || "Unknown error",
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🅱️ BOSTA — bulk create
  // ═══════════════════════════════════════════════════════════
  const bostaOrders = orders.filter((o) => o.shipmentType === "bosta");

  if (bostaOrders.length > 0 && settings?.bosta?.enabled) {
    const creds = getBostaCreds(settings);

    const validOrders: any[] = [];

    for (const order of bostaOrders) {
      try {
        const existing = await BostaShipmentModel.findOne({
          relatedModel: "Order",
          relatedId: order._id.toString(),
        });

        if (existing?.deliveryId) {
          results.bosta.errors.push({
            order_id: order._id.toString(),
            reference: order.reference,
            error: `Already has shipment: ${existing.trackingNumber}`,
          });
          continue;
        }

        let receiver = null;
        if (order.user) {
          const customer = await CustomerModel.findById(order.user);
          if (customer) {
            const nameParts = (customer.name || "").trim().split(/\s+/);
            receiver = {
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              phone: customer.phone_number || "",
              email: customer.email || "",
            };
          }
        }

        if (!receiver?.phone) {
          results.bosta.errors.push({
            order_id: order._id.toString(),
            reference: order.reference,
            error: "Receiver phone missing",
          });
          continue;
        }

        const addr: any = order.shippingAddress;

        // ✅ نستخدم Bosta fields من الأوردر لو موجودة
        const dropOffAddress = {
          city: addr?.bostaCityName || addr?.city || "",
          zoneId: addr?.bostaZoneId || "",
          districtId: addr?.bostaDistrictId || "",
          firstLine: addr?.street || addr?.details || "",
          buildingNumber: String(addr?.buildingNumber || ""),
          floor: String(addr?.floorNumber || ""),
          apartment: String(addr?.apartmentNumber || ""),
        };

        if (
          !dropOffAddress.city ||
          !dropOffAddress.zoneId ||
          !dropOffAddress.districtId
        ) {
          results.bosta.errors.push({
            order_id: order._id.toString(),
            reference: order.reference,
            error:
              "Order has no Bosta address info (city/zone/district). Create shipment manually.",
          });
          continue;
        }

        const pickup = settings.bosta.pickup;

        const payload = {
          type: 10,
          specs: {
            packageType: settings.bosta?.defaults?.packageType || "Parcel",
            size: settings.bosta?.defaults?.size || "MEDIUM",
            packageDetails: {
              itemsCount: order.cartItems?.length || 1,
              description: `Order #${order.reference}`,
            },
            weight: settings.bosta?.defaults?.weight || 1,
          },
          receiver,
          dropOffAddress,
          pickupAddress: {
            city: pickup.city,
            zoneId: pickup.zoneId,
            districtId: pickup.districtId,
            firstLine: pickup.firstLine,
            buildingNumber: String(pickup.buildingNumber || ""),
            floor: String(pickup.floor || ""),
            apartment: String(pickup.apartment || ""),
          },
          returnAddress: {
            city: pickup.city,
            zoneId: pickup.zoneId,
            districtId: pickup.districtId,
            firstLine: pickup.firstLine,
          },
          businessReference: order._id.toString(),
          notes: `Order #${order.reference}`,
        };

        validOrders.push({ order, payload });
      } catch (err: any) {
        results.bosta.errors.push({
          order_id: order._id.toString(),
          reference: order.reference,
          error: err.message,
        });
      }
    }

    if (validOrders.length > 0) {
      try {
        const payloads = validOrders.map((v) => v.payload);
        const bostaIds = await bostaService.createBulkDeliveries(
          creds,
          payloads,
        );

        for (let i = 0; i < validOrders.length; i++) {
          const { order, payload } = validOrders[i];
          const deliveryId = bostaIds[i];

          if (!deliveryId) {
            results.bosta.failed++;
            results.bosta.errors.push({
              order_id: order._id.toString(),
              error: "No delivery ID returned",
            });
            continue;
          }

          const shipment = await BostaShipmentModel.create({
            superadminId,
            relatedModel: "Order",
            relatedId: order._id.toString(),
            type: 10,
            deliveryId,
            trackingNumber: null,
            status: "PendingPickup",
            cod: 0,
            receiver: payload.receiver,
            dropOffAddress: payload.dropOffAddress,
            weight: payload.specs.weight,
            itemsCount: payload.specs.packageDetails.itemsCount,
            description: payload.specs.packageDetails.description,
          });

          // ✅ نربط الـ shipment بالأوردر
          (order as any).bostaShipment = shipment._id;
          order.status = "processing";
          await order.save();

          results.bosta.created++;
          results.bosta.shipments.push({
            order_id: order._id.toString(),
            reference: order.reference,
            shipmentId: shipment._id,
            deliveryId,
          });
        }
      } catch (bulkError: any) {
        results.bosta.failed += validOrders.length;
        results.bosta.errors.push({
          error: `Bulk failed: ${bulkError.message}`,
        });
      }
    }
  }

  SuccessResponse(res, {
    message: `✅ Bulk complete: Self: ${results.self.assigned}, Bosta: ${results.bosta.created}`,
    results,
  });
};
