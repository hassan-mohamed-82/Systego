import { Router } from "express";
import {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
} from "../../controller/admin/Banner";
import { validate } from "../../middlewares/validation";
import { createBannerSchema, updateBannerSchema } from "../../validation/admin/Banner";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.post(
  "/",
  authorizePermissions("banner", "Add"),
  validate(createBannerSchema),
  catchAsync(createBanner)
);

route.get("/", authorizePermissions("banner", "View"), catchAsync(getBanners));

route.get("/:id", authorizePermissions("banner", "View"), catchAsync(getBannerById));

route.put(
  "/:id",
  authorizePermissions("banner", "Edit"),
  validate(updateBannerSchema),
  catchAsync(updateBanner)
);

route.delete(
  "/:id",
  authorizePermissions("banner", "Delete"),
  catchAsync(deleteBanner)
);

export default route;
