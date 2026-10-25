import mongoose from "mongoose";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { BankAccountModel } from "../models/schema/admin/Financial_Account";
import {
  InstallmentItemModel,
  InstallmentPlanModel,
} from "../models/schema/admin/InstallmentPlan";
import { PaymentModel } from "../models/schema/admin/POS/payment";
import { roundMoney, syncPlanTotals } from "../utils/installment";

type FinancialLine = { account_id: string; amount: number };

const toCents = (value: number) => Math.round(Number(value) * 100);

/**
 * تحصيل قسط (كامل أو جزئي) وتحويله لحساب مالي.
 * مستخدم من POS والأدمن — ونفس الحسابات بتتسجل في Payment لو الخطة مرتبطة بفاتورة POS.
 */
export const collectInstallmentPayment = async ({
  planId,
  itemId,
  amount,
  financials,
  userId,
  note = "",
  enforceWarehouse = true,
}: {
  planId: string;
  itemId: string;
  amount?: number;
  financials: any;
  userId?: string;
  note?: string;
  enforceWarehouse?: boolean;
}) => {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new BadRequest("Invalid plan id");
  }
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new BadRequest("Invalid installment id");
  }

  const plan = await InstallmentPlanModel.findById(planId);
  if (!plan) throw new NotFound("Installment plan not found");

  if (plan.status === "cancelled") {
    throw new BadRequest("This installment plan is cancelled");
  }

  const item: any = await InstallmentItemModel.findOne({
    _id: itemId,
    plan_id: plan._id,
  });
  if (!item) throw new NotFound("Installment not found");

  if (item.status === "paid") {
    throw new BadRequest("This installment is already paid");
  }
  if (item.status === "cancelled") {
    throw new BadRequest("This installment is cancelled");
  }

  const itemRemaining = roundMoney(
    Number(item.amount || 0) - Number(item.paid_amount || 0),
  );
  const paymentAmount = roundMoney(
    amount === undefined || amount === null ? itemRemaining : Number(amount),
  );

  if (!paymentAmount || paymentAmount <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }
  if (toCents(paymentAmount) > toCents(itemRemaining)) {
    throw new BadRequest(
      `Amount exceeds installment remaining (${itemRemaining})`,
    );
  }

  if (!Array.isArray(financials) || financials.length === 0) {
    throw new BadRequest("Financials are required");
  }

  const paymentLines: FinancialLine[] = financials.map((line: any) => {
    const accountId = line.account_id || line.id;
    const value = Number(line.amount);

    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      throw new BadRequest("Invalid account_id in financials");
    }
    if (!value || value <= 0) {
      throw new BadRequest("Each payment line must have amount > 0");
    }

    return { account_id: String(accountId), amount: roundMoney(value) };
  });

  const financialsTotal = roundMoney(
    paymentLines.reduce((sum, line) => sum + line.amount, 0),
  );

  if (toCents(financialsTotal) !== toCents(paymentAmount)) {
    throw new BadRequest(
      `Sum of financials (${financialsTotal}) must equal amount (${paymentAmount})`,
    );
  }

  for (const line of paymentLines) {
    const bankAccount = await BankAccountModel.findOne({
      _id: line.account_id,
      ...(enforceWarehouse
        ? { warehouseId: plan.warehouse_id }
        : {
            $or: [
              { warehouseId: plan.warehouse_id },
              { warehouseId: { $exists: false } },
            ],
          }),
      status: true,
      in_POS: true,
    });

    if (!bankAccount) {
      throw new BadRequest(
        `Account ${line.account_id} is not valid for this branch`,
      );
    }
  }

  const newPaidAmount = roundMoney(
    Number(item.paid_amount || 0) + paymentAmount,
  );
  const isFullyPaid = toCents(newPaidAmount) >= toCents(Number(item.amount || 0));

  item.paid_amount = newPaidAmount;
  item.payments.push({
    amount: paymentAmount,
    account_id: paymentLines[0]?.account_id,
    paid_at: new Date(),
    paid_by: userId,
    note,
  });

  if (isFullyPaid) {
    item.status = "paid";
    item.paid_at = new Date();
    item.paid_by = userId;
  }

  await item.save();

  // تسجيل الدفعة في Payment عشان تظهر في تقارير الكاشير (POS فقط)
  if (plan.sale_id) {
    await PaymentModel.create({
      sale_id: plan.sale_id,
      financials: paymentLines,
      status: "completed",
    });
  }

  for (const line of paymentLines) {
    await BankAccountModel.findByIdAndUpdate(line.account_id, {
      $inc: { balance: line.amount },
    });
  }

  const updatedPlan = await syncPlanTotals(String(plan._id));

  return {
    plan: updatedPlan,
    installment: item,
    paid_amount: paymentAmount,
    installment_remaining: roundMoney(
      Math.max(0, Number(item.amount || 0) - newPaidAmount),
    ),
    fully_paid: isFullyPaid,
  };
};
