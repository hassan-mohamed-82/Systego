import { Request, Response } from "express";
import { CurrencyModel  } from "../../models/schema/admin/Currency";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createCurrency=async(req:Request,res:Response)=>{
    const {name, ar_name,amount,isdefault}=req.body;
    if(!name) throw new BadRequest("Currency name is required");
    const existingCurrency=await CurrencyModel.findOne({name});
    if(existingCurrency) throw new BadRequest("Currency already exists");
    const currency=await CurrencyModel.create({name, ar_name,amount,isdefault});
    SuccessResponse(res,{message:"Currency created successfully",currency});
}

export const getCurrencies=async(req:Request,res:Response)=>{
    const currencies=await CurrencyModel.find();
    SuccessResponse(res,{message:"Get currencies successfully",currencies});
}

export const getCurrencyById=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Currency ID is required");
    const currency=await CurrencyModel.findById(id);
    if(!currency) throw new NotFound("Currency not found");
    SuccessResponse(res,{message:"Get currency successfully",currency});
}

export const deleteCurrency=async(req:Request,res:Response)=>{
    const {id}=req.params;
    if(!id) throw new BadRequest("Currency ID is required");
    const currency=await CurrencyModel.findByIdAndDelete(id);
    if(!currency) throw new NotFound("Currency not found");
    SuccessResponse(res,{message:"Currency deleted successfully",currency});
}

export const updateCurrency = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) throw new BadRequest("Currency ID is required");
    
    const currency = await CurrencyModel.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!currency) throw new NotFound("Currency not found");
    
    if (currency.isdefault === true) {
        await CurrencyModel.updateMany(
            { _id: { $ne: id } },    // كل العملات ما عدا دي
            { isdefault: false }      // خليها false
        );
    }
    
    SuccessResponse(res, { message: "Currency updated successfully", currency });
}

