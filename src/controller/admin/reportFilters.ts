import { Request, Response } from "express";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { CashierModel } from "../../models/schema/admin/cashier";
import { SuccessResponse } from "../../utils/response";
import { resolveBranchIds } from "../../utils/reportFilters";

// ═══════════════════════════════════════════════════════════
// 🌿 خيارات فلاتر التقارير (الفروع + نقاط البيع)
// endpoint خفيف مخصص للـ dropdowns بدون تحميل منتجات أو بيانات
// ═══════════════════════════════════════════════════════════
export const getReportFilterOptions = async (req: Request, res: Response) => {
  const branchIds = resolveBranchIds(req.query);

  const warehouseQuery: any = { enabled: true };
  if (branchIds.length > 0) warehouseQuery._id = { $in: branchIds };

  const cashierQuery: any = { status: true };
  if (branchIds.length > 0) cashierQuery.warehouse_id = { $in: branchIds };

  const [warehouses, cashiers] = await Promise.all([
    WarehouseModel.find(warehouseQuery).select("name ar_name").sort({ createdAt: 1 }).lean(),
    CashierModel.find(cashierQuery).select("name ar_name warehouse_id").lean(),
  ]);

  return SuccessResponse(res, {
    message: "Report filter options fetched successfully",
    warehouses,
    cashiers,
  });
};
