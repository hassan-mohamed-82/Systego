import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { catchAsync } from "../../utils/catchAsync";
import { submitTenantPayment, getTenantPaymentStatus } from "../../utils/tenantService";

export const submitPaymentController = catchAsync(async (req: Request, res: Response) => {
    const { payment_cycle, screenshot } = req.body || {};
    const result = await submitTenantPayment(payment_cycle, screenshot);
    return SuccessResponse(res, { message: "Payment submitted.", data: result }, 200);
});

export const paymentStatusController = catchAsync(async (req: Request, res: Response) => {
    const result = await getTenantPaymentStatus();
    return SuccessResponse(res, { message: "Payment status retrieved.", data: result }, 200);
});
