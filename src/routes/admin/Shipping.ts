import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { authorizePermissions } from "../../middlewares/haspremission"; 

import {
  getShippingSettings,
  updateShippingSettings,
  getFreeShippingProducts,
  updateFreeShippingProducts,
} from "../../controller/admin/Shipping";
import {
  updateShippingSettingsSchema,
  updateFreeShippingProductsSchema,
} from "../../validation/admin/Shipping";

const route = Router();

route.get(
  "/settings",
  authorizePermissions("zone", "View"),
  catchAsync(getShippingSettings)
);
route.put(
  "/settings",
  authorizePermissions("zone", "Edit"),
  validate(updateShippingSettingsSchema),
  catchAsync(updateShippingSettings)
);

route.get(
  "/free-products",
  authorizePermissions("product", "View"),
  catchAsync(getFreeShippingProducts)
);
route.put(
  "/free-products",
  authorizePermissions("product", "Edit"),
  validate(updateFreeShippingProductsSchema),
  catchAsync(updateFreeShippingProducts)
);

export default route;
