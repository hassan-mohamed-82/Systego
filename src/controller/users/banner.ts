import asyncHandler from "express-async-handler";
import { SuccessResponse } from "../../utils/response";
import { BannerModel } from "../../models/schema/admin/Banner";
import { Request, Response } from "express";

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
    const banners = await BannerModel.find({ isActive: true });
    SuccessResponse(res, {
        message: "Banners retrieved successfully",
        data: banners
    });
});