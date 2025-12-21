import { Request, Response } from 'express';
import { PaymentMethodModel } from '../../models/schema/admin/payment_methods';
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound } from '../../Errors/NotFound';
import { UnauthorizedError } from '../../Errors/unauthorizedError';
import { SuccessResponse } from '../../utils/response';
import { saveBase64Image } from '../../utils/handleImages';

export const getAllPaymentMethods = async (req: Request, res: Response) => {
      
        const paymentMethods = await PaymentMethodModel.find();
    if (!paymentMethods) throw new NotFound('No payment methods found');
    SuccessResponse(res, { message: 'All payment methods fetched successfully', paymentMethods });
}

export const getPaymentMethodById = async (req: Request, res: Response) => {
    
        const { id } = req.params;
    if (!id) throw new BadRequest('Please provide payment method id');
    const paymentMethod = await PaymentMethodModel.findById(id);
    if (!paymentMethod) throw new NotFound('Payment method not found');
    SuccessResponse(res, { message: 'Payment method fetched successfully', paymentMethod });
}


export const createPaymentMethod = async (req: Request, res: Response) => {
  const { name, discription, icon, type, ar_name, isActive } = req.body;

  if (!name || !ar_name || !discription || !icon || !type) {
    throw new BadRequest("Please provide all the required fields");
  }

  const existingPaymentMethod = await PaymentMethodModel.findOne({ 
    $or: [{ name }, { ar_name }] 
  });
  if (existingPaymentMethod) throw new BadRequest("Payment method already exists");

  const iconUrl = await saveBase64Image(icon, Date.now().toString(), req, "payment_methods");

  const paymentMethod = await PaymentMethodModel.create({
    name,
    ar_name,
    discription,
    icon: iconUrl,
    isActive: isActive !== undefined ? isActive : true,
    type
  });

  SuccessResponse(res, {
    message: "Payment method created successfully",
    paymentMethod,
  });
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Payment method id is required");

  const { name, ar_name, discription, icon, type, isActive } = req.body;
  
  const paymentMethod = await PaymentMethodModel.findById(id);
  if (!paymentMethod) throw new NotFound("Payment method not found");

  if (name !== undefined) paymentMethod.name = name;
  if (ar_name !== undefined) paymentMethod.ar_name = ar_name;
  if (discription !== undefined) paymentMethod.discription = discription;
  if (type !== undefined) paymentMethod.type = type;
  if (isActive !== undefined) paymentMethod.isActive = isActive;
  
  if (icon) {
    paymentMethod.icon = await saveBase64Image(
      icon,
      Date.now().toString(),
      req,
      "payment_methods"
    );
  }

  await paymentMethod.save();

  SuccessResponse(res, {
    message: "Payment method updated successfully",
    paymentMethod,
  });
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
     
    const { id } = req.params;
    if (!id) throw new BadRequest('Please provide payment method id');
    const paymentMethod = await PaymentMethodModel.findByIdAndDelete(id);
    if (!paymentMethod) throw new NotFound('Payment method not found');
    SuccessResponse(res, { message: 'Payment method deleted successfully' });
}
