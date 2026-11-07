import { Request, Response } from "express";
import { OrderModel } from "../../models/schema/users/Order";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { NotificationModel } from "../../models/schema/admin/Notfication";
import { BadRequest, NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

/**
 * 🌐 Public ecommerce online-orders API.
 *
 * These endpoints are intentionally NOT protected by the admin/customer JWT.
 * They are protected by the X-API-KEY header only (see ecommerceApiKey
 * middleware). The key is the tenant's key, so every client/deployment has
 * its own key.
 *
 * Flow:
 *   POST /api/public/online-orders          → create a pending order
 *   POST /api/public/online-orders/accept   → pending → processing
 *   POST /api/public/online-orders/reject   → pending → canceled
 */

const normalizeText = (value: any): string =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const normalizePhone = (value: any): string =>
  normalizeText(value).replace(/[\s\-()]/g, "").replace(/^\+/, "");

const parseMoney = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(/,/g, ""));

  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
};

const serializeOrder = (order: any) => ({
  _id: order._id,
  id: order.externalId ?? null,
  reference: order.reference ?? null,
  status: order.status,
  customer_name: order.customerName || "",
  customer_phone: order.customerPhone || "",
  total_price: order.totalOrderPrice ?? 0,
  currency: order.currency || "EGP",
  created_at: order.createdAt ?? null,
  updated_at: order.updatedAt ?? null,
});

const findOrCreateCustomer = async (name: string, phone: string) => {
  try {
    return await CustomerModel.findOneAndUpdate(
      { phone_number: phone },
      { $setOnInsert: { name, phone_number: phone } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error: any) {
    // Race: another request created the same phone between find and upsert.
    if (error?.code === 11000) {
      return CustomerModel.findOne({ phone_number: phone });
    }
    // A bad legacy record should not block receiving the order. The raw
    // customer name/phone are still stored on the order itself.
    console.warn("[online-orders] Could not link customer:", error?.message);
    return null;
  }
};

/**
 * Pick a sensible payment method for an external order.
 * The ecommerce payload does not include one, so:
 *   1. use payment_method if the caller sent a valid active one,
 *   2. otherwise prefer cash / COD,
 *   3. otherwise use the oldest active method,
 *   4. otherwise leave it null (the order is still valid).
 */
const resolvePaymentMethodId = async (requested: any) => {
  try {
    if (requested && /^[a-fA-F0-9]{24}$/.test(String(requested))) {
      const selected = await PaymentMethodModel.findOne({
        _id: requested,
        isActive: { $ne: false },
      })
        .select("_id")
        .lean();

      if (selected) return selected._id;
    }

    const preferred = await PaymentMethodModel.findOne({
      isActive: { $ne: false },
      $or: [
        { name: /cash/i },
        { name: /cod/i },
        { ar_name: /كاش/ },
        { ar_name: /الدفع عند الاستلام/ },
      ],
    })
      .select("_id")
      .lean();

    if (preferred) return preferred._id;

    const anyActive = await PaymentMethodModel.findOne({
      isActive: { $ne: false },
    })
      .sort({ createdAt: 1 })
      .select("_id")
      .lean();

    return anyActive?._id ?? null;
  } catch (error: any) {
    console.warn(
      "[online-orders] Could not resolve payment method:",
      error?.message
    );
    return null;
  }
};

const findOrderByExternalId = async (rawId: any) => {
  const id = normalizeText(rawId);

  if (!id) {
    throw new BadRequest("id is required");
  }

  let order = null;

  // 1) MongoDB _id (24 hex chars)
  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    order = await OrderModel.findById(id);
  }

  // 2) The id sent by the ecommerce when the order was created.
  if (!order) {
    order = await OrderModel.findOne({ externalId: id });
  }

  // 3) The 8-char Systego reference, as a convenience fallback.
  if (!order) {
    order = await OrderModel.findOne({ reference: id });
  }

  return order;
};

const emitNewOrder = (req: Request, order: any) => {
  try {
    const io = (req as any).app?.get?.("io");
    if (io) io.emit("new_order", order);
  } catch (error: any) {
    console.warn("[online-orders] Socket emit failed:", error?.message);
  }
};

// ═══════════════════════════════════════════════════════════
// 🟢 Create online order
// ═══════════════════════════════════════════════════════════
export const createEcommerceOnlineOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const externalId = normalizeText(req.body?.id ?? req.query?.id);
  const customerName = normalizeText(req.body?.customer_name);
  const customerPhone = normalizePhone(req.body?.customer_phone);
  const totalPrice = parseMoney(req.body?.total_price);
  const currency = (normalizeText(req.body?.currency) || "EGP").toUpperCase();

  if (!externalId) {
    throw new BadRequest("id is required");
  }

  if (!customerName) {
    throw new BadRequest("customer_name is required");
  }

  if (!customerPhone) {
    throw new BadRequest("customer_phone is required");
  }

  if (!/^\d{10,15}$/.test(customerPhone)) {
    throw new BadRequest("customer_phone must contain 10 to 15 digits");
  }

  if (totalPrice === null) {
    throw new BadRequest("total_price must be a valid number >= 0");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequest("currency must be a 3-letter code (e.g. EGP)");
  }

  // Idempotency: ecommerce systems often retry after a timeout. Returning
  // the already-created order is safer than creating a duplicate.
  const existing = await OrderModel.findOne({ externalId }).lean();
  if (existing) {
    SuccessResponse(res, {
      message: "Order already exists",
      created: false,
      order: serializeOrder(existing),
    });
    return;
  }

  const customer = await findOrCreateCustomer(customerName, customerPhone);
  const paymentMethodId = await resolvePaymentMethodId(
    req.body?.payment_method
  );

  // The Orders schema requires a payment method (existing store behaviour).
  // We do not relax that rule; instead fail with a clear setup message.
  if (!paymentMethodId) {
    throw new BadRequest(
      "No active payment method is configured. Add one in the admin or send payment_method in the request."
    );
  }

  // Link the order to the online branch when one is configured, matching the
  // normal store checkout behaviour. It is optional for the integration.
  let warehouseId: any = null;
  try {
    const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true })
      .select("_id")
      .lean();
    warehouseId = (onlineWarehouse as any)?._id ?? null;
  } catch (error: any) {
    console.warn(
      "[online-orders] Could not resolve online warehouse:",
      error?.message
    );
  }

  const now = new Date();

  let order;
  try {
    order = await OrderModel.create({
      externalId,
      customerName,
      customerPhone,
      currency,
      user: customer?._id ?? null,
      orderType: "delivery",
      warehouse: warehouseId || undefined,
      shippingPrice: 0,
      totalOrderPrice: totalPrice,
      totalPriceAfterDiscount: totalPrice,
      taxAmount: 0,
      serviceFee: 0,
      paymentMethod: paymentMethodId,
      paymentGateway: "manual",
      paymentStatus: "unpaid",
      status: "pending",
      statusDescription: "Online order received from ecommerce",
      statusHistory: [
        {
          status: "pending",
          description: "Online order received from ecommerce",
          source: "customer",
          updatedBy: null,
          updatedAt: now,
        },
      ],
      // Keep the order compatible with the existing online-orders admin
      // screen, which expects a shipping method before it can accept an order.
      shippingMethod: "self",
      shipmentType: "self",
    });
  } catch (error: any) {
    // Racing retries with the same externalId: return the winner.
    if (error?.code === 11000 && error?.keyPattern?.externalId) {
      const winner = await OrderModel.findOne({ externalId }).lean();
      if (winner) {
        SuccessResponse(res, {
          message: "Order already exists",
          created: false,
          order: serializeOrder(winner),
        });
        return;
      }
    }
    throw error;
  }

  // 🔔 Keep the same new-order notification behaviour as the store checkout.
  try {
    await NotificationModel.create({
      type: "new_order",
      message: `New online order #${order.reference ?? order._id} from ecommerce`,
    });
  } catch (error: any) {
    console.warn("[online-orders] Notification create failed:", error?.message);
  }

  emitNewOrder(req, order);

  SuccessResponse(
    res,
    {
      message: "Online order created successfully",
      created: true,
      order: serializeOrder(order),
    },
    201
  );
};

// ═══════════════════════════════════════════════════════════
// 🟢 Accept online order (pending → processing)
// ═══════════════════════════════════════════════════════════
export const acceptEcommerceOnlineOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const order = await findOrderByExternalId(req.query?.id ?? req.body?.id);

  if (!order) {
    throw new NotFound("Order not found");
  }

  if ((order as any).isDeleted) {
    throw new BadRequest("Order is deleted");
  }

  if (order.status === "processing") {
    SuccessResponse(res, {
      message: "Order is already accepted",
      changed: false,
      order: serializeOrder(order),
    });
    return;
  }

  if (order.status !== "pending") {
    throw new BadRequest(
      `Order cannot be accepted from status "${order.status}"`
    );
  }

  order.status = "processing";
  order.statusDescription = "Order accepted via ecommerce API";
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: "processing",
    description: "Order accepted via ecommerce API",
    source: "system",
    updatedBy: null,
    updatedAt: new Date(),
  } as any);

  await order.save();

  SuccessResponse(res, {
    message: "Order accepted successfully",
    changed: true,
    order: serializeOrder(order),
  });
};

// ═══════════════════════════════════════════════════════════
// 🔴 Reject online order (pending → canceled)
// ═══════════════════════════════════════════════════════════
export const rejectEcommerceOnlineOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const order = await findOrderByExternalId(req.query?.id ?? req.body?.id);

  if (!order) {
    throw new NotFound("Order not found");
  }

  if ((order as any).isDeleted) {
    throw new BadRequest("Order is deleted");
  }

  if (order.status === "canceled") {
    SuccessResponse(res, {
      message: "Order is already rejected",
      changed: false,
      order: serializeOrder(order),
    });
    return;
  }

  if (order.status !== "pending") {
    throw new BadRequest(
      `Order cannot be rejected from status "${order.status}"`
    );
  }

  order.status = "canceled";
  order.statusDescription = "Order rejected via ecommerce API";
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: "canceled",
    description: "Order rejected via ecommerce API",
    source: "system",
    updatedBy: null,
    updatedAt: new Date(),
  } as any);

  await order.save();

  SuccessResponse(res, {
    message: "Order rejected successfully",
    changed: true,
    order: serializeOrder(order),
  });
};
