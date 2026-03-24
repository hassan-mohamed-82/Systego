"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.getBannerById = exports.getBanners = exports.createBanner = exports.getBannerModules = void 0;
const Banner_1 = require("../../models/schema/admin/Banner");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const handleImages_1 = require("../../utils/handleImages");
const constant_1 = require("../../types/constant");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// 1. Get Available Banner Modules
exports.getBannerModules = (0, express_async_handler_1.default)(async (req, res) => {
    (0, response_1.SuccessResponse)(res, {
        message: "Banner modules retrieved successfully",
        modules: constant_1.BANNER_PAGES
    });
});
// 2. Create Banner (With Duplicate Prevention)
exports.createBanner = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, images, isActive } = req.body;
    // Validation: name must be a non-empty array
    if (!name || !Array.isArray(name) || name.length === 0) {
        throw new Errors_1.BadRequest("name must be a non-empty array of page names.");
    }
    // --- CHECK FOR DUPLICATES ---
    const existingBanner = await Banner_1.BannerModel.findOne({
        name: { $in: name },
        isActive: true
    });
    if (existingBanner) {
        const duplicatedPages = existingBanner.name.filter(page => name.includes(page));
        throw new Errors_1.BadRequest(`Active banners already exist for these pages: ${duplicatedPages.join(", ")}`);
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
        throw new Errors_1.BadRequest("images must be a non-empty array.");
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
    (0, response_1.SuccessResponse)(res, { message: "Banner created successfully", banner }, 201);
});
// 3. Get All Banners
exports.getBanners = (0, express_async_handler_1.default)(async (req, res) => {
    const banners = await Banner_1.BannerModel.find().sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { message: "Banners retrieved successfully", banners });
});
// 4. Get Banner By ID
exports.getBannerById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findById(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    (0, response_1.SuccessResponse)(res, { message: "Banner retrieved successfully", banner });
});
// 5. Update Banner (With Duplicate Prevention)
exports.updateBanner = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { name, images, isActive } = req.body;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findById(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    const updateData = {};
    // Check Duplicates on Update
    if (name !== undefined) {
        if (!Array.isArray(name) || name.length === 0) {
            throw new Errors_1.BadRequest("name must be a non-empty array.");
        }
        // Check for duplicates, excluding the current banner
        const duplicateCheck = await Banner_1.BannerModel.findOne({
            _id: { $ne: id },
            name: { $in: name },
            isActive: true
        });
        if (duplicateCheck) {
            const duplicatedPages = duplicateCheck.name.filter(page => name.includes(page));
            throw new Errors_1.BadRequest(`Another active banner is already using these pages: ${duplicatedPages.join(", ")}`);
        }
        updateData.name = name;
    }
    if (isActive !== undefined)
        updateData.isActive = isActive;
    // Process Images on Update
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
});
// 6. Delete Banner
exports.deleteBanner = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Banner ID is required.");
    const banner = await Banner_1.BannerModel.findByIdAndDelete(id);
    if (!banner)
        throw new Errors_1.NotFound("Banner not found");
    (0, response_1.SuccessResponse)(res, { message: "Banner deleted successfully" });
});
