import { Router } from "express";
import {
  getEcommerceData,
  getEcommerceDataById,
  createEcommerceData,
  updateEcommerceData,
  deleteEcommerceData,
} from "../../controller/admin/ecommerceData";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import {
  createEcommerceDataSchema,
  updateEcommerceDataSchema,
} from "../../validation/admin/ecommerceData";

const router = Router();

router.get("/", catchAsync(getEcommerceData));
router.get("/:id", catchAsync(getEcommerceDataById));
router.post(
  "/",
  validate(createEcommerceDataSchema),
  catchAsync(createEcommerceData)
);
router.put(
  "/:id",
  validate(updateEcommerceDataSchema),
  catchAsync(updateEcommerceData)
);
router.delete("/:id", catchAsync(deleteEcommerceData));

export default router;
