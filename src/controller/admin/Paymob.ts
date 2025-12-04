import { Request, Response } from "express";
import { PaymobModel } from "../../models/schema/admin/Paymob";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

export const getPaymobId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const paymob = await PaymobModel.findById(id);
  if (!paymob) throw new NotFound("Paymob not found");

  return SuccessResponse(res, {
    message: "Get Paymob successfully",
    paymob,
  });
};

export const getPaymob = async (req: Request, res: Response) => {
  const paymob = await PaymobModel.find().populate('payment_method_id', "name icon");
  if (!paymob) throw new NotFound("Paymob not found");
  return SuccessResponse(res, {
    message: "Get Paymob successfully",
    paymob,
  });
};

export const createpaymob = async (req: Request, res: Response) => {
  const {
    type,
    callback,
    api_key,
    iframe_id,
    integration_id,
    hmac_key,
    payment_method_id,
  } = req.body;

  if (
    !type ||
    !callback ||
    !api_key ||
    !iframe_id ||
    !integration_id ||
    !hmac_key ||
    !payment_method_id
  )
    throw new BadRequest("Please provide all required fields");

  const existingPaymentMethod = await PaymentMethodModel.findById(payment_method_id);
  if (!existingPaymentMethod) throw new BadRequest("Payment method not found");

  if (!existingPaymentMethod.isActive)
    throw new BadRequest("Payment method is not active");

  if (existingPaymentMethod.type !== "automatic")
    throw new BadRequest("Payment method is not automatic");

  const exist = await PaymobModel.find();
  if (exist.length > 0)
    throw new BadRequest("Paymob already exists");

  const paymob = await PaymobModel.create({
    type,
    callback,
    api_key,
    iframe_id,
    integration_id,
    hmac_key,
    payment_method_id,
  });

  return SuccessResponse(res, {
    message: "Paymob created successfully",
    paymob,
  });
};

export const updatePaymob = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    type,
    callback,
    api_key,
    iframe_id,
    integration_id,
    hmac_key,
    payment_method_id,
  } = req.body;

  // تحقق من وجود السجل
  const paymob = await PaymobModel.findById(id);
  if (!paymob) throw new NotFound("Paymob not found");

  // لو المستخدم بعت payment_method_id جديد، نتحقق منه
  if (payment_method_id) {
    const existingPaymentMethod = await PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod) throw new BadRequest("Payment method not found");

    if (!existingPaymentMethod.isActive)
      throw new BadRequest("Payment method is not active");

    if (existingPaymentMethod.type !== "automatic")
      throw new BadRequest("Payment method is not automatic");

    paymob.payment_method_id = payment_method_id;
  }

  // حدّث الحقول اللي المستخدم بعتها فقط
  if (type) paymob.type = type;
  if (callback) paymob.callback = callback;
  if (api_key) paymob.api_key = api_key;
  if (iframe_id) paymob.iframe_id = iframe_id;
  if (integration_id) paymob.integration_id = integration_id;
  if (hmac_key) paymob.hmac_key = hmac_key;

  await paymob.save();

  return SuccessResponse(res, {
    message: "Paymob updated successfully",
    paymob,
  });
};
