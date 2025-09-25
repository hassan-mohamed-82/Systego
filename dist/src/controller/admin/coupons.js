"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatecoupon = exports.deletecoupon = exports.getcouponById = exports.getcoupons = exports.createcoupons = void 0;
const coupons_1 = require("../../models/schema/admin/coupons");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createcoupons = async (req, res) => {
    const { coupon_code, type, amount, minimum_amount, quantity, available, expired_date } = req.body;
    if (!coupon_code || !type || !amount || !minimum_amount || !quantity || !available || !expired_date)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const coupon = new coupons_1.CouponModel({
        coupon_code,
        type,
        amount,
        minimum_amount,
        quantity,
        available,
        expired_date,
    });
    await coupon.save();
    (0, response_1.SuccessResponse)(res, { message: "Coupon created successfully", coupon });
};
exports.createcoupons = createcoupons;
const getcoupons = async (req, res) => {
    const coupons = await coupons_1.CouponModel.find();
    if (!coupons || coupons.length === 0)
        throw new Errors_1.NotFound("No coupons found");
    (0, response_1.SuccessResponse)(res, { message: "Get coupons successfully", coupons });
};
exports.getcoupons = getcoupons;
const getcouponById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Coupon ID is required");
    const coupon = await coupons_1.CouponModel.findById(id);
    if (!coupon)
        throw new Errors_1.NotFound("Coupon not found");
    (0, response_1.SuccessResponse)(res, { message: "Get coupon successfully", coupon });
};
exports.getcouponById = getcouponById;
const deletecoupon = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Coupon ID is required");
    const coupon = await coupons_1.CouponModel.findByIdAndDelete(id);
    if (!coupon)
        throw new Errors_1.NotFound("Coupon not found");
    (0, response_1.SuccessResponse)(res, { message: "Coupon deleted successfully", coupon });
};
exports.deletecoupon = deletecoupon;
const updatecoupon = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Coupon ID is required");
    const coupon = await coupons_1.CouponModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!coupon)
        throw new Errors_1.NotFound("Coupon not found");
    (0, response_1.SuccessResponse)(res, { message: "Coupon updated successfully", coupon });
};
exports.updatecoupon = updatecoupon;
