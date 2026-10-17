import { Router } from "express";
import { submitPaymentController, paymentStatusController } from "../../controller/admin/subscription";

const router = Router();
router.post("/submit-payment", submitPaymentController);
router.get("/payment-status", paymentStatusController);

export default router;
