// controllers/admin/coupons.ts
import { Request, Response } from "express";
import { CouponModel } from "../../models/schema/admin/coupons";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages"; // ✅ ضيف ده

export const createcoupons = async (req: Request, res: Response) => {
  const {
    coupon_code,
    type,
    amount,
    minimum_amount_for_use,
    quantity,
    available,
    expired_date,
    image, // ✅ جديد (base64)
  } = req.body;

  if (
    !coupon_code ||
    !type ||
    !amount ||
    !quantity ||
    !available ||
    !expired_date
  )
    throw new BadRequest("Please provide all required fields");

  // ✅ احفظ الصورة لو موجودة
  let imageUrl = "";
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    imageUrl = await saveBase64Image(
      image,
      `${Date.now()}_coupon_${coupon_code}`,
      req,
      "coupons",
    );
  }

  const coupon = new CouponModel({
    coupon_code,
    type,
    amount,
    minimum_amount_for_use,
    quantity,
    available,
    expired_date,
    image: imageUrl, // ✅
  });

  await coupon.save();
  SuccessResponse(res, { message: "Coupon created successfully", coupon });
};

export const getcoupons = async (req: Request, res: Response) => {
  const coupons = await CouponModel.find();
  SuccessResponse(res, { message: "Get coupons successfully", coupons });
};

export const getcouponById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Coupon ID is required");
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw new NotFound("Coupon not found");
  SuccessResponse(res, { message: "Get coupon successfully", coupon });
};

export const deletecoupon = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Coupon ID is required");
  const coupon = await CouponModel.findByIdAndDelete(id);
  if (!coupon) throw new NotFound("Coupon not found");
  SuccessResponse(res, { message: "Coupon deleted successfully", coupon });
};

export const updatecoupon = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Coupon ID is required");

  const updateData: any = { ...req.body };

  // ✅ لو الصورة base64 جديدة
  if (
    updateData.image &&
    typeof updateData.image === "string" &&
    updateData.image.startsWith("data:image/")
  ) {
    updateData.image = await saveBase64Image(
      updateData.image,
      `${Date.now()}_coupon_update_${id}`,
      req,
      "coupons",
    );
  }

  const coupon = await CouponModel.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!coupon) throw new NotFound("Coupon not found");

  SuccessResponse(res, { message: "Coupon updated successfully", coupon });
};
