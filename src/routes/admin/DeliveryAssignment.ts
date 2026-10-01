// src/routes/DeliveryAssignment.ts
import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { authorizePermissions } from "../../middlewares/haspremission";
import {
  autoAssign,
  manualAssign,
  unassign,
  updateStatus,
  getAvailableDeliveryMen,
  getDeliveryManOrders,
  getOrderDeliveryInfo,
} from "../../controller/admin/DeliveryAssignment";
import {
  manualAssignSchema,
  updateDeliveryStatusSchema,
} from "../../validation/admin/DeliveryAssignment";

const route = Router();

// ═══════════════════════════════════════════════════════════
// Delivery Men — Available
// ═══════════════════════════════════════════════════════════
route.get(
  "/delivery-men/available",
  authorizePermissions("zone", "View"),
  catchAsync(getAvailableDeliveryMen),
);
route.get(
  "/delivery-men/:id/orders",
  authorizePermissions("zone", "View"),
  catchAsync(getDeliveryManOrders),
);

// ═══════════════════════════════════════════════════════════
// Order Assignment
// ═══════════════════════════════════════════════════════════
route.post(
  "/orders/:orderId/auto-assign",
  authorizePermissions("zone", "Edit"),
  catchAsync(autoAssign),
);
route.post(
  "/orders/:orderId/assign",
  authorizePermissions("zone", "Edit"),
  validate(manualAssignSchema),
  catchAsync(manualAssign),
);
route.post(
  "/orders/:orderId/unassign",
  authorizePermissions("zone", "Edit"),
  catchAsync(unassign),
);
route.post(
  "/orders/:orderId/delivery-status",
  authorizePermissions("zone", "Edit"),
  validate(updateDeliveryStatusSchema),
  catchAsync(updateStatus),
);
route.get(
  "/orders/:orderId/delivery-info",
  authorizePermissions("zone", "View"),
  catchAsync(getOrderDeliveryInfo),
);

export default route;
