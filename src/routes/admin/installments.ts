import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeAnyPermission } from "../../middlewares/haspremission";
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
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(getInstallmentSettingsController),
);
router.put(
  "/settings",
  authorizeAnyPermission(["installments", "Admin"], "Edit"),
  catchAsync(updateInstallmentSettings),
);

// 🧮 معاينة قبل الدفع (POS أو الأدمن)
router.post(
  "/preview",
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(previewInstallment),
);

// ⏰ الأقساط المستحقة
router.get(
  "/due",
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(listDueInstallments),
);

// 📋 الخطط
router.get(
  "/plans",
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(listInstallmentPlans),
);
router.get(
  "/plans/:id",
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(getInstallmentPlan),
);
router.put(
  "/plans/:planId/items/:itemId/pay",
  authorizeAnyPermission(["installments", "POS", "Admin"], "Edit"),
  catchAsync(payInstallment),
);
router.put(
  "/plans/:planId/items/:itemId",
  authorizeAnyPermission(["installments", "POS", "Admin"], "Edit"),
  catchAsync(updateInstallmentItem),
);
router.put(
  "/plans/:id/cancel",
  authorizeAnyPermission(["installments", "POS", "Admin"], "Edit"),
  catchAsync(cancelInstallmentPlan),
);

// 👤 خطط عميل
router.get(
  "/customer/:customerId",
  authorizeAnyPermission(["installments", "POS", "Admin"], "View"),
  catchAsync(getCustomerInstallmentPlans),
);

export default router;
