import { Request, Response } from 'express';
import { PaymentMethodModel } from '../../models/schema/admin/payment_methods';
import asyncHandler from 'express-async-handler';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors/NotFound';

export const getPaymentMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const paymentMethods = await PaymentMethodModel.find({
        isActive: { $ne: false }
    }).lean();

    if (!paymentMethods || paymentMethods.length === 0) {
        throw new NotFound('No payment methods found');
    }

    SuccessResponse(res, {
        message: 'Active payment methods retrieved successfully',
        data: paymentMethods
    }, 200);
});