import { Request, Response } from 'express';
import { PaymentModel } from '../../models/schema/admin/POS/payment';
import { SaleModel, ProductSalesModel } from '../../models/schema/admin/POS/Sale';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound } from '../../Errors/NotFound';
import { UnauthorizedError } from '../../Errors/unauthorizedError';
import { SuccessResponse } from '../../utils/response';
import { saveBase64Image } from '../../utils/handleImages';

export const getpayments=async(req:Request ,res:Response)=>{
    const pending_payments=await PaymentModel.find({status:"pending"});
    const completed_payments=await PaymentModel.find({status:"completed"});
    const failed_payments=await PaymentModel.find({status:"failed"});

    const allPayments=[...pending_payments,...completed_payments,...failed_payments];
    const saleIds=allPayments.map((p:any)=>p.sale_id).filter(Boolean);

    const sales=saleIds.length?await SaleModel.find({_id:{$in:saleIds}}).populate("customer_id","name phone_number").lean():[];
    const saleMap=new Map(sales.map((s:any)=>[String(s._id),s]));

    const items=saleIds.length?await ProductSalesModel.find({sale_id:{$in:saleIds}}).populate("product_id","name image").populate("bundle_id","name").lean():[];
    const itemsBySale=new Map();
    items.forEach((it:any)=>{
        const sid=String(it.sale_id);
        if(!itemsBySale.has(sid)) itemsBySale.set(sid,[]);
        itemsBySale.get(sid).push({
            _id:it._id,
            name:it.product_id?.name||it.bundle_id?.name||"Item",
            image:it.product_id?.image,
            quantity:it.quantity,
            price:it.price,
            subtotal:it.subtotal,
        });
    });

    const enrich=(p:any)=>{
        const sale=saleMap.get(String(p.sale_id));
        return {
            ...p.toObject(),
            sale_reference:sale?.reference||null,
            sale_total:sale?.grand_total||null,
            sale_customer:sale?.customer_id||null,
            sale_date:sale?.date||sale?.createdAt||null,
            items:itemsBySale.get(String(p.sale_id))||[],
        };
    };

    SuccessResponse(res,{
        message:"payments retrieved successfully",
        pending_payments:pending_payments.map(enrich),
        completed_payments:completed_payments.map(enrich),
        failed_payments:failed_payments.map(enrich),
    })
}

export const getpaymentById=async(req:Request ,res:Response)=>{
    const {id}=req.params;
    const payment=await PaymentModel.findById(id);
    if(!payment) throw new NotFound("payment not found");
    SuccessResponse(res,{message:"payment retrieved successfully",payment})
}

