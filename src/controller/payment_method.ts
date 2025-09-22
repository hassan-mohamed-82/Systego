import { Request, Response } from 'express';
import { PaymentMethodModel } from '../models/schema/payment_methods';
import { BadRequest } from '../Errors/BadRequest';
import { NotFound } from '../Errors/NotFound';
import { UnauthorizedError } from '../Errors/unauthorizedError';
import { SuccessResponse } from '../utils/response';
import { saveBase64Image } from '../utils/handleImages';
export const createPaymentMethod = async (req: Request, res: Response) => {

  const { name, discription } = req.body;
  if (!name || !discription) {
    throw new BadRequest("Please provide all the required fields");
  }
let icon = "";
  if (icon) {
    icon = await saveBase64Image(icon, Date.now().toString(), req, "payment_methods");
  }


  const paymentMethod = await PaymentMethodModel.create({
    name,
    discription,
    icon,
    isActive: true,
  });

  SuccessResponse(res, {
    message: "Payment method created successfully",
    paymentMethod,
  });
};

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


export const updatePaymentMethod = async (req: Request, res: Response) => {

  const { id } = req.params;
  if (!id) throw new BadRequest("payment method id is required");

  const updateData: any = { ...req.body };

  if (req.body.icon) {
    updateData.icon = await saveBase64Image(
      req.body.icon,
      Date.now().toString(),
      req,
      "payment_methods"
    );
  }



  await updateData.save(); // حفظ التغييرات

  SuccessResponse(res, { 
    message: "Payment method updated successfully", 
    updateData 
  });
};
export const deletePaymentMethod = async (req: Request, res: Response) => {
     
    const { id } = req.params;
    if (!id) throw new BadRequest('Please provide payment method id');
    const paymentMethod = await PaymentMethodModel.findByIdAndDelete(id);
    if (!paymentMethod) throw new NotFound('Payment method not found');
    SuccessResponse(res, { message: 'Payment method deleted successfully' });
}
