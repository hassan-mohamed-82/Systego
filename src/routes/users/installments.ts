import { Router } from "express";
import { optionalAuthenticated } from "../../middlewares/optionalAuthenticated";
import { catchAsync } from "../../utils/catchAsync";
import {
  getMyInstallmentPlan,
  getMyInstallmentPlans,
  getMyOrderInstallmentPlan,
  getStoreInstallmentSettings,
  previewStoreInstallment,
} from "../../controller/users/installments";

const installmentRouter = Router();

// ⚙️ الإعدادات والمعاينة متاحين قبل تسجيل الدخول (الـ checkout بيحتاجهم)
installmentRouter.get("/settings", catchAsync(getStoreInstallmentSettings));
installmentRouter.post("/preview", catchAsync(previewStoreInstallment));

// 🔐 باقي المسارات تحتاج تسجيل دخول
installmentRouter.use(optionalAuthenticated);

installmentRouter.get("/", catchAsync(getMyInstallmentPlans));
installmentRouter.get(
  "/order/:orderId",
  catchAsync(getMyOrderInstallmentPlan),
);
installmentRouter.get("/:id", catchAsync(getMyInstallmentPlan));

export default installmentRouter;
