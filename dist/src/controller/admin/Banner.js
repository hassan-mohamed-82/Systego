"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.getBannerById = exports.getBanners = exports.createBanner = void 0;
const Banner_1 = require("../../models/schema/admin/Banner");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const handleImages_1 = require("../../utils/handleImages");
const createBanner = async (req, res) => {
    const { name, images, isActive } = req.body;
    if (!name || !images || !Array.isArray(images) || images.length === 0) {
        throw new Errors_1.BadRequest("Name and an array of images are required.");
    }
    // ✅ Process each base64 string and save it to the server
    const imageUrls = [];
    for (let i = 0; i < images.length; i++) {
        const base64String = images[i];
        if (base64String) {
            // Save image with a unique name prefix per image
            const url = await (0, handleImages_1.saveBase64Image)(base64String, `${Date.now()}_banner_${i}`, req, "banners");
            imageUrls.push(url);
        }
    }
    const banner = await Banner_1.BannerModel.create({
        name,
        images: imageUrls,
        isActive: isActive !== undefined ? isActive : true,
    });
    (0, response_1.SuccessResponse)(res, { message: "Banner created successfully", banner });
};
exports.createBanner = createBanner;
const getBanners = async (req, res) => {
    const banners = await Banner_1.BannerModel.find().sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { message: "Banners retrieved successfully", banners });
};
exports.getBanners = getBanners;
const getBannerById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findById(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    (0, response_1.SuccessResponse)(res, { message: "Banner retrieved successfully", banner });
};
exports.getBannerById = getBannerById;
const updateBanner = async (req, res) => {
    const { id } = req.params;
    const { name, images, isActive } = req.body;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findById(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (isActive !== undefined)
        updateData.isActive = isActive;
    // ✅ If new images are provided, parse and OVERWRITE original images array
    if (images && Array.isArray(images)) {
        const imageUrls = [];
        for (let i = 0; i < images.length; i++) {
            const imgString = images[i];
            // Check if it's a base64 string (meaning new image uploaded) vs an old URL
            if (imgString.startsWith("data:image/") || imgString.length > 500) {
                const url = await (0, handleImages_1.saveBase64Image)(imgString, `${Date.now()}_banner_update_${i}`, req, "banners");
                imageUrls.push(url);
            }
            else {
                // If it looks like a URL/path directly from DB, just keep it
                imageUrls.push(imgString);
            }
        }
        updateData.images = imageUrls;
    }
    const updatedBanner = await Banner_1.BannerModel.findByIdAndUpdate(id, updateData, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "Banner updated successfully", banner: updatedBanner });
};
exports.updateBanner = updateBanner;
const deleteBanner = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findByIdAndDelete(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    (0, response_1.SuccessResponse)(res, { message: "Banner deleted successfully" });
};
exports.deleteBanner = deleteBanner;
