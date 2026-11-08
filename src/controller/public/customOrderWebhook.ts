import { Request, Response } from "express";
import mongoose from "mongoose";
import { OrderModel } from "../../models/schema/users/Order";
import { BadRequest, NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

/**
 * E-commerce order status endpoints (external -> Systego).
 *
 * Systego creates the order and forwards it to the e-commerce platform
 * (see `utils/externalOrderSync.ts`). The platform is then the source of truth
 * for the status: it calls these endpoints when it accepts or rejects the
 * order, and the new status is persisted here and visible in the admin panel.
 *
 * These endpoints are intentionally NOT protected by a JWT. They are protected
 * by the `x-api-key` header (see `middlewares/webhookApiKey.ts`).
 *
 *   POST|GET /api/public/orders/accept?id=11088739  -> status "processing"
 *   POST|GET /api/public/orders/reject?id=11088739  -> status "canceled"
 *
 * The identifier can be sent as a query string (`?id=...`), in the JSON body
 * (`{ "id": "..." }`), or as a route param. Aliases:
 * `id`, `order_id`, `orderId`, `reference`.
 */

// Order statuses used by the rest of the system:
// - "processing" = accepted (same status the admin uses when accepting an order)
// - "canceled"   = rejected
const ACCEPTED_STATUS = "processing";
const REJECTED_STATUS = "canceled";

const toText = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return "";
};

const serializeOrder = (order: any) => ({
  order_id: order.externalOrderId || order.reference || String(order._id || ""),
  id: order._id,
  reference: order.reference ?? null,
  external_order_id: order.externalOrderId ?? null,
  status: order.status ?? null,
  status_description: order.statusDescription ?? "",
  total_price: order.totalOrderPrice ?? 0,
  currency: order.currency || "EGP",
  created_at: order.createdAt ?? null,
  updated_at: order.updatedAt ?? null,
});

const resolveOrderIdentifier = (req: Request): string => {
  const query = (req.query || {}) as any;
  const body = (req.body || {}) as any;
  const params = (req.params || {}) as any;

  return firstNonEmpty(
    query.id,
    query.order_id,
    query.orderId,
    query.reference,
    body.id,
    body.order_id,
    body.orderId,
    body.reference,
    params.id,
  );
};

const findOrderByIdentifier = async (identifier: string) => {
  if (!identifier) {
    throw new BadRequest(
      "id is required. Send it as a query parameter (?id=...) or in the body.",
    );
  }

  const conditions: any[] = [
    { externalOrderId: identifier },
    { reference: identifier },
  ];

  if (mongoose.isValidObjectId(identifier)) {
    conditions.push({ _id: identifier });
  }

  const order = await OrderModel.findOne({ $or: conditions });
  if (!order) throw new NotFound("Order not found");

  return order;
};

const emitOrderStatusChanged = (req: Request, order: any) => {
  try {
    const io = (req as any).app?.get?.("io");
    if (io) io.emit("order_status_changed", serializeOrder(order));
  } catch (error) {
    console.warn("socket emit failed", error);
  }
};

// ═══════════════════════════════════════════════════════════
// 🔄 SHARED STATUS CHANGER (accept / reject)
// ═══════════════════════════════════════════════════════════
const changeOrderStatus = async (
  req: Request,
  res: Response,
  status: string,
  description: string,
): Promise<void> => {
  const identifier = resolveOrderIdentifier(req);
  const order = await findOrderByIdentifier(identifier);

  const previousStatus = order.status;

  if (previousStatus === status) {
    SuccessResponse(res, {
      message: `Order is already ${status}`,
      changed: false,
      previous_status: previousStatus,
      order: serializeOrder(order),
    });
    return;
  }

  order.status = status;
  order.statusDescription = description;

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status,
    description,
    source: "system",
    updatedBy: null,
    updatedAt: new Date(),
  } as any);

  await order.save();

  emitOrderStatusChanged(req, order);

  SuccessResponse(res, {
    message: `Order ${
      status === ACCEPTED_STATUS ? "accepted" : "rejected"
    } successfully`,
    changed: true,
    previous_status: previousStatus,
    order: serializeOrder(order),
  });
};

// ═══════════════════════════════════════════════════════════
// ✅ ACCEPT ORDER
// POST|GET /api/public/orders/accept?id=11088739
// ═══════════════════════════════════════════════════════════
export const acceptCustomOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await changeOrderStatus(
    req,
    res,
    ACCEPTED_STATUS,
    "Order accepted by the e-commerce platform",
  );
};

// ═══════════════════════════════════════════════════════════
// ❌ REJECT ORDER
// POST|GET /api/public/orders/reject?id=11088739
// ═══════════════════════════════════════════════════════════
export const rejectCustomOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await changeOrderStatus(
    req,
    res,
    REJECTED_STATUS,
    "Order rejected by the e-commerce platform",
  );
};
