import { GiftCardModel } from "../../../models/schema/admin/POS/giftCard";
import { Request, Response } from "express";
import { BadRequest } from "../../../Errors/BadRequest";
import { NotFound } from "../../../Errors/NotFound";
import { SuccessResponse } from "../../../utils/response";


export const createGiftCard = async (req: Request, res: Response): Promise<void> => {
    const { code, amount, customer_id, expiration_date } = req.body;

    const existingCard = await GiftCardModel.findOne({ code });
    if (existingCard) {
        throw new BadRequest("Gift card code already exists");
    }

    const newGiftCard = new GiftCardModel({
        code,
        amount,
        customer_id,
        expiration_date
    });
    await newGiftCard.save();
 SuccessResponse(res, {message: "Gift card created successfully", newGiftCard});
}

export const getGiftCard = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const giftCard = await GiftCardModel.findById(id).populate('customer_id', 'name email');
    if (!giftCard) {
        throw new NotFound("Gift card not found");
    }

    SuccessResponse(res, { giftCard });
}

export const getAllGiftCards = async (req: Request, res: Response): Promise<void> => {
    const giftCards = await GiftCardModel.find().populate('customer_id', 'name');
    SuccessResponse(res, { giftCards });
}

export const redeemGiftCard = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { amount } = req.body;

    const giftCard = await GiftCardModel.findById(id);
    if (!giftCard) {
        throw new NotFound("Gift card not found");
    }

    if (!giftCard.isActive) {
        throw new BadRequest("Gift card is inactive");
    }

    if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
        throw new BadRequest("Gift card has expired");
    }

    // update amount
    giftCard.amount = amount;
    await giftCard.save();
    SuccessResponse(res, { message: "Gift card redeemed successfully", remainingBalance: giftCard.amount });
}

export const updateGiftCard = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { code, amount, customer_id, expiration_date, isActive } = req.body;
    const giftCard = await GiftCardModel.findByIdAndUpdate(id, { code, amount, customer_id, expiration_date, isActive });
    if (!giftCard) {
        throw new NotFound("Gift card not found");
    }
    SuccessResponse(res, { message: "Gift card updated successfully", giftCard });
}


        
