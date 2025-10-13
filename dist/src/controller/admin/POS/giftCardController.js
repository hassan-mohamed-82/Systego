"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGiftCard = exports.redeemGiftCard = exports.getAllGiftCards = exports.getGiftCard = exports.createGiftCard = void 0;
const giftCard_1 = require("../../../models/schema/admin/POS/giftCard");
const BadRequest_1 = require("../../../Errors/BadRequest");
const NotFound_1 = require("../../../Errors/NotFound");
const response_1 = require("../../../utils/response");
const createGiftCard = async (req, res) => {
    const { code, amount, customer_id, expiration_date } = req.body;
    const existingCard = await giftCard_1.GiftCardModel.findOne({ code });
    if (existingCard) {
        throw new BadRequest_1.BadRequest("Gift card code already exists");
    }
    const newGiftCard = new giftCard_1.GiftCardModel({
        code,
        amount,
        customer_id,
        expiration_date
    });
    await newGiftCard.save();
    (0, response_1.SuccessResponse)(res, { message: "Gift card created successfully", newGiftCard });
};
exports.createGiftCard = createGiftCard;
const getGiftCard = async (req, res) => {
    const { id } = req.params;
    const giftCard = await giftCard_1.GiftCardModel.findById(id).populate('customer_id', 'name email');
    if (!giftCard) {
        throw new NotFound_1.NotFound("Gift card not found");
    }
    (0, response_1.SuccessResponse)(res, { giftCard });
};
exports.getGiftCard = getGiftCard;
const getAllGiftCards = async (req, res) => {
    const giftCards = await giftCard_1.GiftCardModel.find().populate('customer_id', 'name');
    (0, response_1.SuccessResponse)(res, { giftCards });
};
exports.getAllGiftCards = getAllGiftCards;
const redeemGiftCard = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const giftCard = await giftCard_1.GiftCardModel.findById(id);
    if (!giftCard) {
        throw new NotFound_1.NotFound("Gift card not found");
    }
    if (!giftCard.isActive) {
        throw new BadRequest_1.BadRequest("Gift card is inactive");
    }
    if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
        throw new BadRequest_1.BadRequest("Gift card has expired");
    }
    // update amount
    giftCard.amount = amount;
    await giftCard.save();
    (0, response_1.SuccessResponse)(res, { message: "Gift card redeemed successfully", remainingBalance: giftCard.amount });
};
exports.redeemGiftCard = redeemGiftCard;
const updateGiftCard = async (req, res) => {
    const { id } = req.params;
    const { code, amount, customer_id, expiration_date, isActive } = req.body;
    const giftCard = await giftCard_1.GiftCardModel.findByIdAndUpdate(id, { code, amount, customer_id, expiration_date, isActive });
    if (!giftCard) {
        throw new NotFound_1.NotFound("Gift card not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "Gift card updated successfully", giftCard });
};
exports.updateGiftCard = updateGiftCard;
