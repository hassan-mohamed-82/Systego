import { Request, Response } from "express";
import { BannerModel } from "../../models/schema/admin/Banner";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";
import { BANNER_PAGES } from "../../types/constant";
import asyncHandler from 'express-async-handler';

// 1. Get Available Banner Modules
export const getBannerModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    SuccessResponse(res, { 
        message: "Banner modules retrieved successfully", 
        modules: BANNER_PAGES 
    });
});

// 2. Create Banner (With Duplicate Prevention)
export const createBanner = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, images, isActive } = req.body;

    // Validation: name must be a non-empty array
    if (!name || !Array.isArray(name) || name.length === 0) {
        throw new BadRequest("name must be a non-empty array of page names.");
    }

    // --- CHECK FOR DUPLICATES ---
    const existingBanner = await BannerModel.findOne({
        name: { $in: name },
        isActive: true
    });

    if (existingBanner) {
        const duplicatedPages = existingBanner.name.filter(page => name.includes(page));
        throw new BadRequest(`Active banners already exist for these pages: ${duplicatedPages.join(", ")}`);
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
        throw new BadRequest("images must be a non-empty array.");
    }

  // ✅ Process each base64 string and save it to the server
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
        const base64String = images[i];
        if (base64String) {
            // Save image with a unique name prefix per image
            const url = await saveBase64Image(
                base64String,
                `${Date.now()}_banner_${i}`,
                req,
                "banners"
            );
            imageUrls.push(url);
        }
    }

    const banner = await BannerModel.create({
        name,
        images: imageUrls,
        isActive: isActive !== undefined ? isActive : true,
    });

    SuccessResponse(res, { message: "Banner created successfully", banner }, 201);
});

// 3. Get All Banners
export const getBanners = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const banners = await BannerModel.find().sort({ createdAt: -1 });
    SuccessResponse(res, { message: "Banners retrieved successfully", banners });
});

// 4. Get Banner By ID
export const getBannerById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) throw new BadRequest("Banner ID is required.");

    const banner = await BannerModel.findById(id);
    if (!banner) throw new NotFound("Banner not found");

    SuccessResponse(res, { message: "Banner retrieved successfully", banner });
});

// 5. Update Banner (With Duplicate Prevention)
export const updateBanner = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, images, isActive } = req.body;

    if (!id) throw new BadRequest("Banner ID is required.");

    const banner = await BannerModel.findById(id);
    if (!banner) throw new NotFound("Banner not found");

    const updateData: any = {};

    // Check Duplicates on Update
    if (name !== undefined) {
        if (!Array.isArray(name) || name.length === 0) {
            throw new BadRequest("name must be a non-empty array.");
        }

        // Check for duplicates, excluding the current banner
        const duplicateCheck = await BannerModel.findOne({
            _id: { $ne: id },
            name: { $in: name },
            isActive: true
        });

        if (duplicateCheck) {
            const duplicatedPages = duplicateCheck.name.filter(page => name.includes(page));
            throw new BadRequest(`Another active banner is already using these pages: ${duplicatedPages.join(", ")}`);
        }
        updateData.name = name;
    }

    if (isActive !== undefined) updateData.isActive = isActive;

    // Process Images on Update
    if (images && Array.isArray(images)) {
        const imageUrls: string[] = [];
        for (let i = 0; i < images.length; i++) {
            const imgString = images[i];
            // Check if it's a base64 string (meaning new image uploaded) vs an old URL
            if (imgString.startsWith("data:image/") || imgString.length > 500) {
                const url = await saveBase64Image(
                    imgString,
                    `${Date.now()}_banner_update_${i}`,
                    req,
                    "banners"
                );
                imageUrls.push(url);
            } else {
                // If it looks like a URL/path directly from DB, just keep it
                imageUrls.push(imgString);
            }
        }
        updateData.images = imageUrls;
    }

    const updatedBanner = await BannerModel.findByIdAndUpdate(id, updateData, { new: true });

    SuccessResponse(res, { message: "Banner updated successfully", banner: updatedBanner });
});

// 6. Delete Banner
export const deleteBanner = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Banner ID is required.");

    const banner = await BannerModel.findByIdAndDelete(id);
    if (!banner) throw new NotFound("Banner not found");

    SuccessResponse(res, { message: "Banner deleted successfully" });
});
