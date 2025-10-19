import { Request, Response } from 'express';
import { PaymentModel } from '../../models/schema/admin/POS/payment';
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound } from '../../Errors/NotFound';
import { UnauthorizedError } from '../../Errors/unauthorizedError';
import { SuccessResponse } from '../../utils/response';
import { saveBase64Image } from '../../utils/handleImages';

export const getpayments=async(req:Request ,res:Response)=>{
    const pending_payments=await PaymentModel.find({status:"pending"});
    const completed_payments=await PaymentModel.find({status:"completed"});
    const failed_payments=await PaymentModel.find({status:"failed"});
    SuccessResponse(res,{message:"payments retrieved successfully",pending_payments,completed_payments,failed_payments})
}

export const getpaymentById=async(req:Request ,res:Response)=>{
    const {id}=req.params;
    const payment=await PaymentModel.findById(id);
    if(!payment) throw new NotFound("payment not found");
    SuccessResponse(res,{message:"payment retrieved successfully",payment})
}

export const updatepayment=async(req:Request ,res:Response)=>{
    const {id}=req.params;
    const status= req.body;
    const payment=await PaymentModel.findById(id);
    if(!payment) throw new NotFound("payment not found");
    if(payment.status!=="pending") throw new UnauthorizedError("you can't update this payment");
    if(status ==="completed" || status ==="failed"){
        payment.status=status;
        await payment.save();
     }
    SuccessResponse(res,{message:"payment updated successfully"})
}