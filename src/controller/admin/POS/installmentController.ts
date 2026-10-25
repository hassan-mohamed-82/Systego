import { Request, Response } from "express";
import mongoose from "mongoose";
import { BadRequest } from "../../../Errors/BadRequest";
import { NotFound } from "../../../Errors/NotFound";
import {
  InstallmentItemModel,
  InstallmentPlanModel,
} from "../../../models/schema/admin/InstallmentPlan";
import { collectInstallmentPayment } from "../../../services/installmentPayment.service";
import {
  calculateInstallmentSchedule,
  getInstallmentSettings,
  markOverdueInstallments,
  roundMoney,
  serializePlan,
} from "../../../utils/installment";
import { SuccessResponse } from "../../../utils/response";

const getWarehouseId = (req: Request) => {
  const warehouseId = (req.user as any)?.warehouse_id;
  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }
  return String(warehouseId);
};

// ══════════════════════════════════════════════════════════════
// ⚙️ إعدادات التقسيط للـ POS (عرض فقط)
// GET /api/admin/pos/installments/settings
// ══════════════════════════════════════════════════════════════
export const getPosInstallmentSettings = async (
  req: Request,
  res: Response,
) => {
  const settings = await getInstallmentSettings();

  SuccessResponse(res, {
    message: "Installment settings fetched successfully",
    settings: {
      enabled: !!settings?.enabled,
      interest_type: settings?.interest_type || "percentage",
      interest_value: Number(settings?.interest_value || 0),
      max_installments: Number(settings?.max_installments || 12),
      min_down_payment_percent: Number(
        settings?.min_down_payment_percent || 0,
      ),
    },
  });
};

// ══════════════════════════════════════════════════════════════
// 🧮 معاينة الخطة
// POST /api/admin/pos/installments/preview
// body: { total, months, down_payment? }
// ══════════════════════════════════════════════════════════════
export const previewPosInstallment = async (req: Request, res: Response) => {
  const { total, months, down_payment = 0 } = req.body;

  const settings = await getInstallmentSettings();

  const calculation = calculateInstallmentSchedule({
    total: Number(total),
    downPayment: Number(down_payment),
    months: Number(months),
    settings: settings as any,
  });

  SuccessResponse(res, {
    message: "Installment plan preview",
    plan: calculation,
  });
};

// ══════════════════════════════════════════════════════════════
// 📋 خطط الفرع
// GET /api/admin/pos/installments/plans?status=&customer_id=&search=
// ══════════════════════════════════════════════════════════════
export const listPosInstallmentPlans = async (
  req: Request,
  res: Response,
) => {
  const warehouseId = getWarehouseId(req);
  const { status, customer_id, search, page = 1, limit = 20 } = req.query as any;

  await markOverdueInstallments();

  const filter: any = { warehouse_id: warehouseId };

  if (status) {
    if (!["active", "completed", "cancelled"].includes(status)) {
      throw new BadRequest("Invalid status filter");
    }
    filter.status = status;
  }

  if (customer_id) {
    filter.customer_id = String(customer_id).trim();
  }

  if (search) {
    filter.$or = [
      { plan_number: { $regex: String(search), $options: "i" } },
      { order_reference: { $regex: String(search), $options: "i" } },
    ];
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));

  const [plans, total] = await Promise.all([
    InstallmentPlanModel.find(filter)
      .populate("customer_id", "name phone_number")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    InstallmentPlanModel.countDocuments(filter),
  ]);

  SuccessResponse(res, {
    message: "Installment plans fetched successfully",
    page: pageNumber,
    limit: pageSize,
    total,
    plans: plans.map((plan: any) => serializePlan(plan)),
  });
};

// ══════════════════════════════════════════════════════════════
// 🔎 تفاصيل خطة
// GET /api/admin/pos/installments/plans/:id
// ══════════════════════════════════════════════════════════════
export const getPosInstallmentPlan = async (req: Request, res: Response) => {
  const warehouseId = getWarehouseId(req);
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid plan id");
  }

  await markOverdueInstallments(id);

  const plan = await InstallmentPlanModel.findOne({
    _id: id,
    warehouse_id: warehouseId,
  })
    .populate("customer_id", "name phone_number")
    .lean();

  if (!plan) throw new NotFound("Installment plan not found");

  const items = await InstallmentItemModel.find({ plan_id: id })
    .sort({ sequence: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Installment plan fetched successfully",
    plan: serializePlan(plan, items),
  });
};

// ══════════════════════════════════════════════════════════════
// ⏰ الأقساط المستحقة / المتأخرة في الفرع
// GET /api/admin/pos/installments/due?status=&days=&customer_id=
// ══════════════════════════════════════════════════════════════
export const listPosDueInstallments = async (
  req: Request,
  res: Response,
) => {
  const warehouseId = getWarehouseId(req);
  const { status, days = 0, customer_id, search } = req.query as any;

  await markOverdueInstallments();

  const planFilter: any = {
    warehouse_id: warehouseId,
    status: { $in: ["active", "completed"] },
  };
  if (customer_id) {
    planFilter.customer_id = String(customer_id).trim();
  }

  const plans = await InstallmentPlanModel.find(planFilter)
    .select(
      "_id plan_number source total_payable paid_amount remaining_amount down_payment order_total",
    )
    .lean();

  const itemFilter: any = {
    plan_id: { $in: plans.map((plan) => plan._id) },
  };

  if (status === "paid") {
    itemFilter.status = "paid";
  } else if (status === "overdue") {
    itemFilter.status = "overdue";
  } else {
    itemFilter.status = { $in: ["pending", "overdue"] };
  }

  if (Number(days) > 0 && status !== "overdue") {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + Number(days));
    itemFilter.due_date = { $lte: limitDate };
  }

  const items = await InstallmentItemModel.find(itemFilter)
    .populate("customer_id", "name phone_number")
    .sort({ due_date: 1 })
    .lean();

  const planMap = new Map(
    plans.map((plan: any) => [String(plan._id), plan]),
  );

  let rows = items.map((item: any) => ({
    ...item,
    amount: roundMoney(Number(item.amount || 0)),
    paid_amount: roundMoney(Number(item.paid_amount || 0)),
    remaining_amount: roundMoney(
      Math.max(0, Number(item.amount || 0) - Number(item.paid_amount || 0)),
    ),
    plan: planMap.get(String(item.plan_id)) || null,
  }));

  if (search) {
    const keyword = String(search).toLowerCase().trim();
    rows = rows.filter((row: any) => {
      const name = String(row.customer_id?.name || "").toLowerCase();
      const phone = String(row.customer_id?.phone_number || "").toLowerCase();
      return (
        name.includes(keyword) ||
        phone.includes(keyword) ||
        String(row.plan?.plan_number || "").toLowerCase().includes(keyword)
      );
    });
  }

  const totalRemaining = roundMoney(
    rows.reduce((sum, row) => sum + row.remaining_amount, 0),
  );

  SuccessResponse(res, {
    message: "Due installments fetched successfully",
    count: rows.length,
    total_remaining: totalRemaining,
    installments: rows,
  });
};

// ══════════════════════════════════════════════════════════════
// 💵 تحصيل قسط من الكاشير
// PUT /api/admin/pos/installments/plans/:planId/items/:itemId/pay
// body: { amount?, financials: [{account_id, amount}], note? }
// ══════════════════════════════════════════════════════════════
export const payPosInstallment = async (req: Request, res: Response) => {
  const warehouseId = getWarehouseId(req);
  const user = req.user as any;
  const { planId, itemId } = req.params;
  const { amount, financials, note } = req.body;

  const plan = await InstallmentPlanModel.findById(planId).lean();
  if (!plan) throw new NotFound("Installment plan not found");

  if (String((plan as any).warehouse_id) !== warehouseId) {
    throw new BadRequest("This plan belongs to another branch");
  }

  const result = await collectInstallmentPayment({
    planId,
    itemId,
    amount,
    financials,
    userId: user?.id,
    note,
    enforceWarehouse: true,
  });

  SuccessResponse(res, {
    message: result.fully_paid
      ? "Installment paid successfully"
      : "Partial payment recorded successfully",
    plan_id: planId,
    installment: result.installment,
    paid_amount: result.paid_amount,
    installment_remaining: result.installment_remaining,
    plan: result.plan,
  });
};

// ══════════════════════════════════════════════════════════════
// 👤 خطط عميل (من الفرع الحالي)
// GET /api/admin/pos/installments/customer/:customerId
// ══════════════════════════════════════════════════════════════
export const getPosCustomerInstallmentPlans = async (
  req: Request,
  res: Response,
) => {
  const warehouseId = getWarehouseId(req);
  const { customerId } = req.params;

  if (!String(customerId || "").trim()) {
    throw new BadRequest("Invalid customer id");
  }

  await markOverdueInstallments();

  const plans = await InstallmentPlanModel.find({
    customer_id: String(customerId),
    warehouse_id: warehouseId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const totals = plans.reduce(
    (acc: any, plan: any) => {
      acc.total_payable = roundMoney(
        acc.total_payable + Number(plan.total_payable || 0),
      );
      acc.paid_amount = roundMoney(
        acc.paid_amount + Number(plan.paid_amount || 0),
      );
      acc.remaining_amount = roundMoney(
        acc.remaining_amount + Number(plan.remaining_amount || 0),
      );
      return acc;
    },
    { total_payable: 0, paid_amount: 0, remaining_amount: 0 },
  );

  SuccessResponse(res, {
    message: "Customer installment plans fetched successfully",
    count: plans.length,
    ...totals,
    plans: plans.map((plan: any) => serializePlan(plan)),
  });
};
