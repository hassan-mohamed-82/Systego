import { BadRequest } from "../Errors/BadRequest";
import {
  InstallmentItemModel,
  InstallmentPlanModel,
} from "../models/schema/admin/InstallmentPlan";
import { InstallmentSettingModel } from "../models/schema/admin/InstallmentSetting";

export const roundMoney = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** يضيف شهور مع الحفاظ على آخر يوم في الشهر (31 يناير + شهر = 28/29 فبراير) */
export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInTargetMonth = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  d.setDate(Math.min(day, daysInTargetMonth));
  return d;
};

/** إعدادات التقسيط — بتتنشئ تلقائياً بأول مرة بقيم افتراضية */
export const getInstallmentSettings = async () => {
  const settings = await InstallmentSettingModel.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        enabled: true,
        interest_type: "percentage",
        interest_value: 0,
        max_installments: 12,
        min_down_payment_percent: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return settings;
};

export const getPublicInstallmentSettings = async () => {
  const settings = await getInstallmentSettings();

  return {
    enabled: !!settings?.enabled,
    interest_type: settings?.interest_type || "percentage",
    interest_value: Number(settings?.interest_value || 0),
    max_installments: Number(settings?.max_installments || 12),
    min_down_payment_percent: Number(
      settings?.min_down_payment_percent || 0,
    ),
  };
};

export type InstallmentSettingsLike = {
  enabled?: boolean;
  interest_type?: "percentage" | "fixed" | string;
  interest_value?: number;
  max_installments?: number;
  min_down_payment_percent?: number;
};

export type InstallmentScheduleItem = {
  sequence: number;
  amount: number;
  due_date: Date;
};

export type InstallmentCalculation = {
  order_total: number;
  down_payment: number;
  financed_amount: number;
  interest_type: "percentage" | "fixed";
  interest_value: number;
  interest_amount: number;
  total_payable: number;
  installments_count: number;
  start_date: Date;
  installments: InstallmentScheduleItem[];
};

/** تحقق من مدخلات الخطة + حساب الجدول (من غير أي كتابة في الداتابيز) */
export const calculateInstallmentSchedule = ({
  total,
  downPayment = 0,
  months,
  settings,
  startDate = new Date(),
}: {
  total: number;
  downPayment?: number;
  months: number;
  settings: InstallmentSettingsLike;
  startDate?: Date;
}): InstallmentCalculation => {
  const orderTotal = roundMoney(total);
  const down = roundMoney(Math.max(0, Number(downPayment) || 0));

  if (settings.enabled === false) {
    throw new BadRequest("Installments are disabled for this store");
  }

  if (!orderTotal || orderTotal <= 0) {
    throw new BadRequest("Installments require a positive order total");
  }

  const monthsCount = Number(months);
  const maxMonths = Number(settings.max_installments || 12);

  if (!Number.isInteger(monthsCount) || monthsCount < 1) {
    throw new BadRequest("months must be a positive integer");
  }

  if (monthsCount > maxMonths) {
    throw new BadRequest(
      `Maximum number of installments is ${maxMonths}`,
    );
  }

  if (down >= orderTotal) {
    throw new BadRequest(
      "Down payment must be less than the order total",
    );
  }

  const minDownPercent = Number(settings.min_down_payment_percent || 0);
  const minDown = roundMoney((orderTotal * minDownPercent) / 100);

  if (down < minDown) {
    throw new BadRequest(
      `Minimum down payment is ${minDownPercent}% (${minDown})`,
    );
  }

  const financed = roundMoney(orderTotal - down);
  const interestType =
    settings.interest_type === "fixed" ? "fixed" : "percentage";
  const interestValue = Math.max(0, Number(settings.interest_value || 0));

  if (interestType === "percentage" && interestValue > 100) {
    throw new BadRequest("Interest percentage cannot exceed 100");
  }

  const interestAmount = roundMoney(
    interestType === "percentage"
      ? (financed * interestValue) / 100
      : interestValue * monthsCount,
  );

  const totalPayable = roundMoney(orderTotal + interestAmount);
  const financedWithInterest = roundMoney(totalPayable - down);

  if (financedWithInterest < monthsCount) {
    throw new BadRequest(
      "Order total is too small for the selected number of installments",
    );
  }

  // توزيع بالمليم عشان مجموع الأقساط يساوي المبلغ بالظبط (آخر قسط بياخد الباقي)
  const totalCents = Math.round(financedWithInterest * 100);
  const baseCents = Math.floor(totalCents / monthsCount);
  const amountsCents = Array.from(
    { length: monthsCount },
    () => baseCents,
  );
  amountsCents[monthsCount - 1] += totalCents - baseCents * monthsCount;

  const items: InstallmentScheduleItem[] = amountsCents.map(
    (cents, index) => ({
      sequence: index + 1,
      amount: roundMoney(cents / 100),
      due_date: addMonths(startDate, index + 1),
    }),
  );

  return {
    order_total: orderTotal,
    down_payment: down,
    financed_amount: financed,
    interest_type: interestType,
    interest_value: interestValue,
    interest_amount: interestAmount,
    total_payable: totalPayable,
    installments_count: monthsCount,
    start_date: startDate,
    installments: items,
  };
};

const generatePlanNumber = (): string => {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const uniquePart = `${Date.now()}`.slice(-6);
  const randomPart = Math.floor(10 + Math.random() * 90);
  return `INS-${datePart}-${uniquePart}${randomPart}`;
};

/** إنشاء خطة أقساط فعلية (plan + items) بعد حفظ الفاتورة/الأوردر */
export const createInstallmentPlan = async ({
  source,
  saleId,
  orderId,
  customerId,
  warehouseId,
  orderReference = "",
  total,
  downPayment = 0,
  months,
  settings,
  startDate,
  notes = "",
  createdBy,
}: {
  source: "pos" | "ecommerce";
  saleId?: string;
  orderId?: any;
  customerId: string;
  warehouseId: any;
  orderReference?: string;
  total: number;
  downPayment?: number;
  months: number;
  settings: InstallmentSettingsLike;
  startDate?: Date;
  notes?: string;
  createdBy?: any;
}) => {
  const calculation = calculateInstallmentSchedule({
    total,
    downPayment,
    months,
    settings,
    startDate: startDate || new Date(),
  });

  const plan = await InstallmentPlanModel.create({
    plan_number: generatePlanNumber(),
    source,
    sale_id: saleId,
    order_id: orderId,
    customer_id: customerId,
    warehouse_id: warehouseId,
    order_reference: orderReference,
    order_total: calculation.order_total,
    down_payment: calculation.down_payment,
    financed_amount: calculation.financed_amount,
    interest_type: calculation.interest_type,
    interest_value: calculation.interest_value,
    interest_amount: calculation.interest_amount,
    total_payable: calculation.total_payable,
    installments_count: calculation.installments_count,
    paid_amount: 0,
    remaining_amount: roundMoney(
      calculation.total_payable - calculation.down_payment,
    ),
    start_date: calculation.start_date,
    status: "active",
    notes,
    created_by: createdBy,
  });

  const items = await InstallmentItemModel.insertMany(
    calculation.installments.map((item) => ({
      plan_id: plan._id,
      sale_id: saleId,
      order_id: orderId,
      customer_id: customerId,
      warehouse_id: warehouseId,
      sequence: item.sequence,
      amount: item.amount,
      due_date: item.due_date,
      paid_amount: 0,
      status: "pending",
    })),
  );

  return {
    plan: plan.toObject(),
    items: items.map((item: any) => item.toObject()),
    calculation,
  };
};

/** يحدّث حالة الأقساط المتأخرة (due_date عدّت ولسه pending) */
export const markOverdueInstallments = async (planId?: string) => {
  const filter: any = {
    status: "pending",
    due_date: { $lt: new Date() },
  };
  if (planId) filter.plan_id = planId;

  await InstallmentItemModel.updateMany(filter, { $set: { status: "overdue" } });
};

/** يعيد حساب paid_amount / remaining_amount / status للخطة من الأقساط */
export const syncPlanTotals = async (planId: string) => {
  const plan = await InstallmentPlanModel.findById(planId);
  if (!plan) return null;

  const items: any[] = await InstallmentItemModel.find({ plan_id: planId })
    .sort({ sequence: 1 })
    .lean();

  const paid = items.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0,
  );
  const activeItems = items.filter((item) => item.status !== "cancelled");
  const fullyPaid =
    activeItems.length > 0 &&
    activeItems.every((item) => item.status === "paid");

  const remaining = roundMoney(
    Math.max(0, Number(plan.total_payable || 0) - Number(plan.down_payment || 0) - paid),
  );

  plan.paid_amount = roundMoney(paid);
  plan.remaining_amount = remaining;
  plan.status =
    plan.status === "cancelled"
      ? "cancelled"
      : fullyPaid || remaining <= 0
        ? "completed"
        : "active";
  await plan.save();

  return plan;
};

export const serializePlan = (plan: any, items: any[] = []) => {
  if (!plan) return null;
  const plain = typeof plan.toObject === "function" ? plan.toObject() : plan;

  return {
    ...plain,
    paid_amount: roundMoney(Number(plain.paid_amount || 0)),
    remaining_amount: roundMoney(Number(plain.remaining_amount || 0)),
    installments: items.map((item: any) => ({
      ...(typeof item.toObject === "function" ? item.toObject() : item),
      amount: roundMoney(Number(item.amount || 0)),
      paid_amount: roundMoney(Number(item.paid_amount || 0)),
      remaining_amount: roundMoney(
        Math.max(0, Number(item.amount || 0) - Number(item.paid_amount || 0)),
      ),
    })),
  };
};
