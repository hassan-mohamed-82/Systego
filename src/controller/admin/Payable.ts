import { Request, Response } from "express";
import { PurchaseInstallmentModel } from "../../models/schema/admin/PurchaseInstallment";
import { PurchaseInvoiceModel } from "../../models/schema/admin/PurchaseInvoice";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { CurrencyModel } from "../../models/schema/admin/Currency";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";

export const getPayables = async (req: Request, res: Response) => {
  const {
    supplier_id,
    status,
    from,
    to,
    page = 1,
    limit = 50,
  } = req.query;

  const filter: any = {};

  if (status) {
    if (!["pending", "paid"].includes(String(status))) {
      throw new BadRequest("status must be pending or paid");
    }
    filter.status = status;
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(String(from));
    if (to) filter.date.$lte = new Date(new Date(String(to)).setHours(23, 59, 59, 999));
  }

  const installments = await PurchaseInstallmentModel.find(filter)
    .populate({
      path: "purchase_id",
      select: "supplier_id date currency_id",
      populate: {
        path: "supplier_id",
        select: "username contact_person",
      },
    })
    .sort({ date: 1, createdAt: 1 });

  const defaultCurrency: any = await CurrencyModel.findOne({ isdefault: true })
    .select("name ar_name")
    .lean();

  const filtered = installments.filter((inst: any) => {
    if (!inst.purchase_id) return false;
    if (!supplier_id) return true;
    return String(inst.purchase_id?.supplier_id?._id || "") === String(supplier_id);
  });

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Number(limit) || 50);
  const start = (pageNumber - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const rows = paginated.map((inst: any, index: number) => {
    const amount = Number(inst.amount || 0);
    const paid = Number(inst.paid_amount || 0);
    const remaining = Math.max(0, amount - paid);

    return {
      row_no: start + index + 1,
      installment_id: inst._id,
      purchase_id: inst.purchase_id?._id,
      currency: inst.purchase_id?.currency_id?.name || defaultCurrency?.name || "N/A",
      supplier_name: inst.purchase_id?.supplier_id?.username || "N/A",
      supplier_agent:
        inst.purchase_id?.supplier_id?.contact_person ||
        inst.purchase_id?.supplier_id?.username ||
        "N/A",
      paid,
      amount,
      remaining,
      due_date: inst.date,
      manual_date: inst.createdAt,
      status: inst.status,
      can_add_transaction: remaining > 0,
    };
  });

  SuccessResponse(res, {
    message: "Payables retrieved successfully",
    page: pageNumber,
    limit: pageSize,
    total: filtered.length,
    rows,
  });
};

export const addPayableTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { financial_id, amount, date } = req.body;

  if (!financial_id) throw new BadRequest("financial_id is required");

  const installment = await PurchaseInstallmentModel.findById(id);
  if (!installment) throw new NotFound("Installment not found");

  const totalAmount = Number((installment as any).amount || 0);
  const paidAmount = Number((installment as any).paid_amount || 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  if (installment.status === "paid" || remainingAmount <= 0) {
    throw new BadRequest("Installment is already paid");
  }

  const paymentAmount = amount !== undefined ? Number(amount) : remainingAmount;
  if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new BadRequest("amount must be a positive number");
  }
  if (paymentAmount > remainingAmount) {
    throw new BadRequest(`amount exceeds remaining installment value (${remainingAmount})`);
  }

  const financial = await BankAccountModel.findById(financial_id);
  if (!financial) throw new NotFound("Financial account not found");
  if (Number((financial as any).balance || 0) < paymentAmount) {
    throw new BadRequest("Insufficient balance in financial account");
  }

  await PurchaseInvoiceModel.create({
    financial_id,
    amount: paymentAmount,
    purchase_id: installment.purchase_id,
    installment_id: installment._id,
    date: date ? new Date(date) : new Date(),
  });

  (financial as any).balance -= paymentAmount;
  await financial.save();

  (installment as any).paid_amount = paidAmount + paymentAmount;
  installment.status = (installment as any).paid_amount >= totalAmount ? "paid" : "pending";
  await installment.save();

  SuccessResponse(res, {
    message: "Installment transaction added successfully",
    installment,
    paid_amount: (installment as any).paid_amount,
    remaining_amount: Math.max(0, totalAmount - Number((installment as any).paid_amount || 0)),
    account_balance: (financial as any).balance,
  });
};
