import { Request, Response } from "express";
import mongoose from "mongoose";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import {
  InstallmentItemModel,
  InstallmentPlanModel,
} from "../../models/schema/admin/InstallmentPlan";
import { InstallmentSettingModel } from "../../models/schema/admin/InstallmentSetting";
import { collectInstallmentPayment } from "../../services/installmentPayment.service";
import {
  calculateInstallmentSchedule,
  getInstallmentSettings,
  markOverdueInstallments,
  roundMoney,
  serializePlan,
  syncPlanTotals,
} from "../../utils/installment";
import { SuccessResponse } from "../../utils/response";

const assertWarehouseAccess = (req: Request, warehouseId: any) => {
  const user = req.user as any;
  if (!user || user.role === "superadmin") return;
  if (!user.warehouse_id) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }
  if (String(user.warehouse_id) !== String(warehouseId)) {
    throw new BadRequest("You are not allowed to access another branch");
  }
};

// ══════════════════════════════════════════════════════════════
// ⚙️ الإعدادات (الفايدة / أقصى عدد أقساط / أقل مقدم)
// ══════════════════════════════════════════════════════════════
export const getInstallmentSettingsController = async (
  req: Request,
  res: Response,
) => {
  const settings = await getInstallmentSettings();
  SuccessResponse(res, {
    message: "Installment settings fetched successfully",
    settings,
  });
};

export const updateInstallmentSettings = async (
  req: Request,
  res: Response,
) => {
  const {
    enabled,
    interest_type,
    interest_value,
    max_installments,
    min_down_payment_percent,
  } = req.body;

  if (
    interest_type !== undefined &&
    !["percentage", "fixed"].includes(String(interest_type))
  ) {
    throw new BadRequest("interest_type must be percentage or fixed");
  }

  if (
    interest_value !== undefined &&
    (Number(interest_value) < 0 || Number.isNaN(Number(interest_value)))
  ) {
    throw new BadRequest("interest_value must be >= 0");
  }

  if (
    interest_type === "percentage" &&
    Number(interest_value) > 100
  ) {
    throw new BadRequest("Interest percentage cannot exceed 100");
  }

  if (max_installments !== undefined) {
    const value = Number(max_installments);
    if (!Number.isInteger(value) || value < 1 || value > 60) {
      throw new BadRequest("max_installments must be between 1 and 60");
    }
  }

  if (min_down_payment_percent !== undefined) {
    const value = Number(min_down_payment_percent);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      throw new BadRequest(
        "min_down_payment_percent must be between 0 and 100",
      );
    }
  }

  const user = req.user as any;

  const settings = await InstallmentSettingModel.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(interest_type !== undefined && { interest_type }),
        ...(interest_value !== undefined && {
          interest_value: Number(interest_value),
        }),
        ...(max_installments !== undefined && {
          max_installments: Number(max_installments),
        }),
        ...(min_down_payment_percent !== undefined && {
          min_down_payment_percent: Number(min_down_payment_percent),
        }),
        updated_by: user?.id,
      },
      $setOnInsert: { key: "default" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  SuccessResponse(res, {
    message: "Installment settings updated successfully",
    settings,
  });
};

// ══════════════════════════════════════════════════════════════
// 🧮 معاينة الخطة قبل الدفع
// POST /api/admin/installments/preview
// body: { total, months, down_payment?, start_date? }
// ══════════════════════════════════════════════════════════════
export const previewInstallment = async (req: Request, res: Response) => {
  const { total, months, down_payment = 0, start_date } = req.body;

  const settings = await getInstallmentSettings();

  const calculation = calculateInstallmentSchedule({
    total: Number(total),
    downPayment: Number(down_payment),
    months: Number(months),
    settings: settings as any,
    startDate: start_date ? new Date(start_date) : new Date(),
  });

  SuccessResponse(res, {
    message: "Installment plan preview",
    plan: calculation,
  });
};

// ══════════════════════════════════════════════════════════════
// 📋 قائمة الخطط
// ══════════════════════════════════════════════════════════════
export const listInstallmentPlans = async (req: Request, res: Response) => {
  const user = req.user as any;
  const {
    status,
    source,
    customer_id,
    warehouse_id,
    from,
    to,
    search,
    page = 1,
    limit = 20,
  } = req.query as any;

  await markOverdueInstallments();

  const filter: any = {};

  if (status) {
    if (!["active", "completed", "cancelled", "overdue"].includes(status)) {
      throw new BadRequest("Invalid status filter");
    }
    filter.status = status;
  }
  if (source) {
    if (!["pos", "ecommerce"].includes(source)) {
      throw new BadRequest("Invalid source filter");
    }
    filter.source = source;
  }
  if (customer_id) {
    filter.customer_id = String(customer_id).trim();
  }

  // غير السوبر أدمن: مقيد بفرعه
  if (user?.role !== "superadmin") {
    if (!user?.warehouse_id) {
      throw new BadRequest("Warehouse is not assigned to this user");
    }
    filter.warehouse_id = user.warehouse_id;
  } else if (warehouse_id) {
    filter.warehouse_id = warehouse_id;
  }

  if (from || to) {
    filter.start_date = {};
    if (from) filter.start_date.$gte = new Date(String(from));
    if (to) {
      filter.start_date.$lte = new Date(
        new Date(String(to)).setHours(23, 59, 59, 999),
      );
    }
  }

  if (search) {
    const keyword = String(search).trim();
    const customers = await CustomerModel.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { phone_number: { $regex: keyword, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    filter.$or = [
      { plan_number: { $regex: keyword, $options: "i" } },
      { order_reference: { $regex: keyword, $options: "i" } },
      { customer_id: { $in: customers.map((c) => String(c._id)) } },
    ];
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));

  const [plans, total] = await Promise.all([
    InstallmentPlanModel.find(filter)
      .populate("customer_id", "name phone_number email")
      .populate("warehouse_id", "name")
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
// 🔎 تفاصيل خطة + الأقساط
// ══════════════════════════════════════════════════════════════
export const getInstallmentPlan = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid plan id");
  }

  await markOverdueInstallments(id);

  const plan = await InstallmentPlanModel.findById(id)
    .populate("customer_id", "name phone_number email")
    .populate("warehouse_id", "name")
    .lean();

  if (!plan) throw new NotFound("Installment plan not found");

  assertWarehouseAccess(req, (plan as any).warehouse_id?._id || (plan as any).warehouse_id);

  const items = await InstallmentItemModel.find({ plan_id: id })
    .sort({ sequence: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Installment plan fetched successfully",
    plan: serializePlan(plan, items),
  });
};

// ══════════════════════════════════════════════════════════════
// 💵 تحصيل قسط
// PUT /api/admin/installments/plans/:planId/items/:itemId/pay
// body: { amount?, financials: [{ account_id, amount }], note? }
// ══════════════════════════════════════════════════════════════
export const payInstallment = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { planId, itemId } = req.params;
  const { amount, financials, note } = req.body;

  const plan = await InstallmentPlanModel.findById(planId).lean();
  if (!plan) throw new NotFound("Installment plan not found");

  assertWarehouseAccess(req, (plan as any).warehouse_id);

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
// ✏️ تعديل قسط (المبلغ / تاريخ الاستحقاق) — للأدمن
// PUT /api/admin/installments/plans/:planId/items/:itemId
// body: { amount?, due_date? }
// ══════════════════════════════════════════════════════════════
export const updateInstallmentItem = async (req: Request, res: Response) => {
  const { planId, itemId } = req.params;
  const { amount, due_date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new BadRequest("Invalid plan id");
  }
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new BadRequest("Invalid installment id");
  }

  const plan = await InstallmentPlanModel.findById(planId);
  if (!plan) throw new NotFound("Installment plan not found");

  assertWarehouseAccess(req, plan.warehouse_id);

  if (plan.status === "cancelled") {
    throw new BadRequest("This installment plan is cancelled");
  }

  const item: any = await InstallmentItemModel.findOne({
    _id: itemId,
    plan_id: plan._id,
  });
  if (!item) throw new NotFound("Installment not found");
  if (item.status === "cancelled") {
    throw new BadRequest("This installment is cancelled");
  }

  const paidAmount = roundMoney(Number(item.paid_amount || 0));

  if (amount !== undefined && amount !== null && amount !== "") {
    const value = roundMoney(Number(amount));

    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequest("Amount must be greater than 0");
    }
    if (value < paidAmount) {
      throw new BadRequest(
        `Amount cannot be less than the paid amount (${paidAmount})`,
      );
    }

    item.amount = value;
  }

  if (due_date !== undefined && due_date !== null && due_date !== "") {
    const parsed = new Date(due_date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequest("Invalid due date");
    }
    item.due_date = parsed;
  }

  const itemRemaining = roundMoney(
    Number(item.amount || 0) - Number(item.paid_amount || 0),
  );

  if (itemRemaining <= 0) {
    item.status = "paid";
    item.paid_at = item.paid_at || new Date();
  } else {
    item.paid_at = null;
    item.status =
      new Date(item.due_date).getTime() < Date.now() ? "overdue" : "pending";
  }

  await item.save();

  // إعادة حساب إجمالي الخطة من المقدم + مجموع الأقساط الحالية
  const activeItems: any[] = await InstallmentItemModel.find({
    plan_id: plan._id,
    status: { $ne: "cancelled" },
  }).lean();

  const scheduleTotal = activeItems.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );

  plan.total_payable = roundMoney(
    Number(plan.down_payment || 0) + scheduleTotal,
  );
  plan.interest_amount = roundMoney(
    Math.max(0, Number(plan.total_payable) - Number(plan.order_total || 0)),
  );
  await plan.save();

  const updatedPlan = await syncPlanTotals(String(plan._id));

  const items = await InstallmentItemModel.find({ plan_id: plan._id })
    .sort({ sequence: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Installment updated successfully",
    installment: item,
    plan: serializePlan(updatedPlan, items),
  });
};

// ══════════════════════════════════════════════════════════════
// ❌ إلغاء خطة
// ══════════════════════════════════════════════════════════════
export const cancelInstallmentPlan = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid plan id");
  }

  const plan = await InstallmentPlanModel.findById(id);
  if (!plan) throw new NotFound("Installment plan not found");

  assertWarehouseAccess(req, plan.warehouse_id);

  if (plan.status === "cancelled") {
    throw new BadRequest("Plan is already cancelled");
  }
  if (plan.status === "completed") {
    throw new BadRequest("Completed plans cannot be cancelled");
  }

  plan.status = "cancelled";
  await plan.save();

  await InstallmentItemModel.updateMany(
    { plan_id: plan._id, status: { $in: ["pending", "overdue"] } },
    { $set: { status: "cancelled" } },
  );

  const items = await InstallmentItemModel.find({ plan_id: plan._id })
    .sort({ sequence: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Installment plan cancelled successfully",
    plan: serializePlan(plan, items),
  });
};

// ══════════════════════════════════════════════════════════════
// ⏰ الأقساط المستحقة / المتأخرة (لكل الفروع أو فرع واحد)
// GET /api/admin/installments/due?status=overdue|pending&days=7
// ══════════════════════════════════════════════════════════════
export const listDueInstallments = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { status, days = 0, customer_id } = req.query as any;

  await markOverdueInstallments();

  const planFilter: any = { status: { $in: ["active", "completed"] } };
  if (user?.role !== "superadmin") {
    if (!user?.warehouse_id) {
      throw new BadRequest("Warehouse is not assigned to this user");
    }
    planFilter.warehouse_id = user.warehouse_id;
  }
  if (customer_id) {
    planFilter.customer_id = String(customer_id).trim();
  }

  const plans = await InstallmentPlanModel.find(planFilter)
    .select("_id")
    .lean();
  const planIds = plans.map((p) => p._id);

  const filter: any = {
    plan_id: { $in: planIds },
  };

  if (status === "paid") {
    filter.status = "paid";
  } else if (status === "overdue") {
    filter.status = "overdue";
  } else {
    filter.status = { $in: ["pending", "overdue"] };
  }

  if (Number(days) > 0 && status !== "overdue") {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + Number(days));
    filter.due_date = { $lte: limitDate };
  }

  const items = await InstallmentItemModel.find(filter)
    .populate("customer_id", "name phone_number")
    .populate("warehouse_id", "name")
    .sort({ due_date: 1 })
    .lean();

  const planDocs: any[] = await InstallmentPlanModel.find({
    _id: { $in: items.map((item: any) => item.plan_id) },
  })
    .select("plan_number source total_payable down_payment paid_amount remaining_amount status")
    .lean();

  const planMap = new Map(
    planDocs.map((plan: any) => [String(plan._id), plan]),
  );

  const rows = items.map((item: any) => ({
    ...item,
    amount: roundMoney(Number(item.amount || 0)),
    paid_amount: roundMoney(Number(item.paid_amount || 0)),
    remaining_amount: roundMoney(
      Math.max(0, Number(item.amount || 0) - Number(item.paid_amount || 0)),
    ),
    plan: planMap.get(String(item.plan_id)) || null,
  }));

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
// 👤 خطط عميل معيّن
// GET /api/admin/installments/customer/:customerId
// ══════════════════════════════════════════════════════════════
export const getCustomerInstallmentPlans = async (
  req: Request,
  res: Response,
) => {
  const { customerId } = req.params;

  if (!String(customerId || "").trim()) {
    throw new BadRequest("Invalid customer id");
  }

  await markOverdueInstallments();

  const plans = await InstallmentPlanModel.find({
    customer_id: String(customerId),
  })
    .populate("warehouse_id", "name")
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
