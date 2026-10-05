// src/routes/onlineOrders.js
import { Router } from "express";
import {
  getAllOnlineOrders,
  getOnlineOrderById,
  updateOnlineOrderStatus,
  bulkCreateShipments,
  updateOrderBostaAddress,
} from "../../controller/admin/onlineOrders";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get(
  "/",
  authorizePermissions("orders", "View"),
  catchAsync(getAllOnlineOrders),
);

router.post(
  "/bulk-create-shipments",
  authorizePermissions("orders", "Edit"),
  catchAsync(bulkCreateShipments),
);

router.get(
  "/:id",
  authorizePermissions("orders", "View"),
  catchAsync(getOnlineOrderById),
);

router.patch(
  "/:id/status",
  authorizePermissions("orders", "Edit"),
  catchAsync(updateOnlineOrderStatus),
);

router.patch(
  "/:id/bosta-address",
  authorizePermissions("orders", "Edit"),
  catchAsync(updateOrderBostaAddress),
);

export default router;
