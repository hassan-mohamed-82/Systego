import { Router } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { authorizePermissions } from "../../../middlewares/haspremission";
import {
  getPosCustomerInstallmentPlans,
  getPosInstallmentPlan,
  getPosInstallmentSettings,
  listPosDueInstallments,
  listPosInstallmentPlans,
  payPosInstallment,
  previewPosInstallment,
} from "../../../controller/admin/POS/installmentController";

const router = Router();

// ⚙️ إعدادات التقسيط (عرض فقط للكاشير)
router.get(
  "/settings",
  authorizePermissions("POS", "View"),
  catchAsync(getPosInstallmentSettings),
);

// 🧮 معاينة الخطة قبل الدفع
router.post(
  "/preview",
  authorizePermissions("POS", "View"),
  catchAsync(previewPosInstallment),
);

// ⏰ الأقساط المستحقة / المتأخرة على الفرع
router.get(
  "/due",
  authorizePermissions("POS", "View"),
  catchAsync(listPosDueInstallments),
);

// 📋 خطط الفرع
router.get(
  "/plans",
  authorizePermissions("POS", "View"),
  catchAsync(listPosInstallmentPlans),
);
router.get(
  "/plans/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getPosInstallmentPlan),
);

// 💵 تحصيل قسط
router.put(
  "/plans/:planId/items/:itemId/pay",
  authorizePermissions("POS", "Edit"),
  catchAsync(payPosInstallment),
);

// 👤 خطط عميل
router.get(
  "/customer/:customerId",
  authorizePermissions("POS", "View"),
  catchAsync(getPosCustomerInstallmentPlans),
);

export default router;
