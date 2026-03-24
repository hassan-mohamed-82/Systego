import { Request, Response } from "express";
import { BannerModel } from "../../models/schema/admin/Banner";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";

export const createBanner = async (req: Request, res: Response) => {
  const { name, images, isActive } = req.body;

  // name must be a non-empty array of page strings
  if (!name || !Array.isArray(name) || name.length === 0) {
    throw new BadRequest("name must be a non-empty array of page names.");
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

  SuccessResponse(res, { message: "Banner created successfully", banner });
};

export const getBanners = async (req: Request, res: Response) => {
  const banners = await BannerModel.find().sort({ createdAt: -1 });
  SuccessResponse(res, { message: "Banners retrieved successfully", banners });
};

export const getBannerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) throw new BadRequest("Banner ID is required.");

  const banner = await BannerModel.findById(id);
  if (!banner) throw new NotFound("Banner not found");

  SuccessResponse(res, { message: "Banner retrieved successfully", banner });
};

export const updateBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, images, isActive } = req.body;

  if (!id) throw new BadRequest("Banner ID is required.");

  const banner = await BannerModel.findById(id);
  if (!banner) throw new NotFound("Banner not found");

  const updateData: any = {};

  // name is now an array of page strings
  if (name !== undefined) {
    if (!Array.isArray(name) || name.length === 0) {
      throw new BadRequest("name must be a non-empty array of page names.");
    }
    updateData.name = name;
  }

  if (isActive !== undefined) updateData.isActive = isActive;

  // ✅ If new images are provided, parse and OVERWRITE original images array
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
};

export const deleteBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Banner ID is required.");

  const banner = await BannerModel.findByIdAndDelete(id);
  if (!banner) throw new NotFound("Banner not found");

  SuccessResponse(res, { message: "Banner deleted successfully" });
};
