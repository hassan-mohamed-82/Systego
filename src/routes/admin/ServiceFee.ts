import { Router } from "express";
import {
  createServiceFee,
  getAllServiceFees,
  getServiceFeeById,
  updateServiceFee,
  deleteServiceFee,
  toggleServiceFeeStatus,
  getallwarehouses
} from "../../controller/admin/ServiceFee";
import { validate } from "../../middlewares/validation";
import { createServiceFeeSchema, updateServiceFeeSchema } from "../../validation/admin/ServiceFee";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.get("/select", authorizePermissions("service_fees", "View"), catchAsync(getallwarehouses));

route.post("/", authorizePermissions("service_fees", "Add"), validate(createServiceFeeSchema), catchAsync(createServiceFee));
route.get("/", authorizePermissions("service_fees", "View"), catchAsync(getAllServiceFees));
route.get("/:id", authorizePermissions("service_fees", "View"), catchAsync(getServiceFeeById));
route.put("/:id", authorizePermissions("service_fees", "Edit"), validate(updateServiceFeeSchema), catchAsync(updateServiceFee));
route.patch("/:id/status", authorizePermissions("service_fees", "Status"), catchAsync(toggleServiceFeeStatus));
route.delete("/:id", authorizePermissions("service_fees", "Delete"), catchAsync(deleteServiceFee));

export default route;
