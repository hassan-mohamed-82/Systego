import { Request, Response } from "express";
import mongoose from "mongoose";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { UnauthorizedError } from "../../Errors";
import {
  InstallmentItemModel,
  InstallmentPlanModel,
} from "../../models/schema/admin/InstallmentPlan";
import {
  calculateInstallmentSchedule,
  getPublicInstallmentSettings,
  markOverdueInstallments,
  roundMoney,
  serializePlan,
} from "../../utils/installment";
import { SuccessResponse } from "../../utils/response";

// ══════════════════════════════════════════════════════════════
// ⚙️ إعدادات التقسيط (عام — يستخدمها الـ checkout)
// GET /api/store/installments/settings
// ══════════════════════════════════════════════════════════════
export const getStoreInstallmentSettings = async (
  req: Request,
  res: Response,
) => {
  const settings = await getPublicInstallmentSettings();

  SuccessResponse(res, {
    message: "Installment settings fetched successfully",
    settings,
  });
};

// ══════════════════════════════════════════════════════════════
// 🧮 معاينة الخطة (قبل تأكيد الأوردر)
// POST /api/store/installments/preview
// body: { total, months, down_payment? }
// ══════════════════════════════════════════════════════════════
export const previewStoreInstallment = async (
  req: Request,
  res: Response,
) => {
  const { total, months, down_payment = 0 } = req.body;

  const settings = await getPublicInstallmentSettings();

  const calculation = calculateInstallmentSchedule({
    total: Number(total),
    downPayment: Number(down_payment),
    months: Number(months),
    settings,
  });

  SuccessResponse(res, {
    message: "Installment plan preview",
    plan: calculation,
  });
};

// ══════════════════════════════════════════════════════════════
// 📋 خطط العميل
// GET /api/store/installments
// ══════════════════════════════════════════════════════════════
export const getMyInstallmentPlans = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id;
  if (!userId) throw new UnauthorizedError("Not authenticated");

  await markOverdueInstallments();

  const plans = await InstallmentPlanModel.find({
    source: "ecommerce",
    customer_id: String(userId),
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
    message: "Installment plans fetched successfully",
    count: plans.length,
    ...totals,
    plans: plans.map((plan: any) => serializePlan(plan)),
  });
};

// ══════════════════════════════════════════════════════════════
// 🔎 تفاصيل خطة
// GET /api/store/installments/:id
// ══════════════════════════════════════════════════════════════
export const getMyInstallmentPlan = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id;
  if (!userId) throw new UnauthorizedError("Not authenticated");

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid plan id");
  }

  await markOverdueInstallments(id);

  const plan = await InstallmentPlanModel.findOne({
    _id: id,
    customer_id: String(userId),
  })
    .populate("warehouse_id", "name")
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
// 🔎 خطة أوردر معيّن
// GET /api/store/installments/order/:orderId
// ══════════════════════════════════════════════════════════════
export const getMyOrderInstallmentPlan = async (
  req: Request,
  res: Response,
) => {
  const userId = (req.user as any)?.id;
  if (!userId) throw new UnauthorizedError("Not authenticated");

  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new BadRequest("Invalid order id");
  }

  await markOverdueInstallments();

  const plan = await InstallmentPlanModel.findOne({
    order_id: orderId,
    customer_id: String(userId),
  })
    .populate("warehouse_id", "name")
    .lean();

  if (!plan) throw new NotFound("This order has no installment plan");

  const items = await InstallmentItemModel.find({ plan_id: plan._id })
    .sort({ sequence: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Installment plan fetched successfully",
    plan: serializePlan(plan, items),
  });
};
