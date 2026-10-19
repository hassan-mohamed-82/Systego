import { Router } from "express";
import {
  createPickupPoint,
  getPickupPointById,
  getPickupPoints,
  updatePickupPoint,
  deletePickupPoint,
} from "../../controller/admin/pickupPoint";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.post(
  "/",
  authorizePermissions("pickup_point", "Add"),
  catchAsync(createPickupPoint),
);
route.get(
  "/",
  authorizePermissions("pickup_point", "View"),
  catchAsync(getPickupPoints),
);
route.get(
  "/:id",
  authorizePermissions("pickup_point", "View"),
  catchAsync(getPickupPointById),
);
route.put(
  "/:id",
  authorizePermissions("pickup_point", "Edit"),
  catchAsync(updatePickupPoint),
);
route.delete(
  "/:id",
  authorizePermissions("pickup_point", "Delete"),
  catchAsync(deletePickupPoint),
);

export default route;
