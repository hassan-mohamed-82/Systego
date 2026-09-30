import { Router } from "express";
import {
  createDeliveryMan,
  deleteDeliveryMan,
  getDeliveryMen,
  getDeliveryManById,
  updateDeliveryMan,
} from "../../controller/admin/DeliveryMan";

const router = Router();

router.post("/", createDeliveryMan);
router.get("/", getDeliveryMen);
router.get("/:id", getDeliveryManById);
router.put("/:id", updateDeliveryMan);
router.delete("/:id", deleteDeliveryMan);

export default router;
