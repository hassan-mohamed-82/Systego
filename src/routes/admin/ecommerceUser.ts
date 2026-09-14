import { Router } from "express";
import {
  getEcommerceUsers,
  getEcommerceUserById,
  createEcommerceUser,
  updateEcommerceUser,
  deleteEcommerceUser,
} from "../../controller/admin/ecommerceUser";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getEcommerceUsers));
router.get("/:id", catchAsync(getEcommerceUserById));
router.post("/", catchAsync(createEcommerceUser));
router.put("/:id", catchAsync(updateEcommerceUser));
router.delete("/:id", catchAsync(deleteEcommerceUser));

export default router;
