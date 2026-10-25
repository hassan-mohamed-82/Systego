import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";
import {
  cancelInstallmentPlan,
  getCustomerInstallmentPlans,
  getInstallmentPlan,
  getInstallmentSettingsController,
  listDueInstallments,
  listInstallmentPlans,
  payInstallment,
  previewInstallment,
  updateInstallmentItem,
  updateInstallmentSettings,
} from "../../controller/admin/installments";

const router = Router();

// ⚙️ إعدادات التقسيط (الفايدة / أقصى عدد أقساط / أقل مقدم)
router.get(
  "/settings",
  authorizePermissions("POS", "View"),
  catchAsync(getInstallmentSettingsController),
);
router.put(
  "/settings",
  authorizePermissions("Admin", "Edit"),
  catchAsync(updateInstallmentSettings),
);

// 🧮 معاينة قبل الدفع (POS أو الأدمن)
router.post(
  "/preview",
  authorizePermissions("POS", "View"),
  catchAsync(previewInstallment),
);

// ⏰ الأقساط المستحقة
router.get(
  "/due",
  authorizePermissions("POS", "View"),
  catchAsync(listDueInstallments),
);

// 📋 الخطط
router.get(
  "/plans",
  authorizePermissions("POS", "View"),
  catchAsync(listInstallmentPlans),
);
router.get(
  "/plans/:id",
  authorizePermissions("POS", "View"),
  catchAsync(getInstallmentPlan),
);
router.put(
  "/plans/:planId/items/:itemId/pay",
  authorizePermissions("POS", "Edit"),
  catchAsync(payInstallment),
);
router.put(
  "/plans/:planId/items/:itemId",
  authorizePermissions("POS", "Edit"),
  catchAsync(updateInstallmentItem),
);
router.put(
  "/plans/:id/cancel",
  authorizePermissions("POS", "Edit"),
  catchAsync(cancelInstallmentPlan),
);

// 👤 خطط عميل
router.get(
  "/customer/:customerId",
  authorizePermissions("POS", "View"),
  catchAsync(getCustomerInstallmentPlans),
);

export default router;
