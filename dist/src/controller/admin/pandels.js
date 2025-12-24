"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveBundles = exports.deletePandel = exports.updatePandel = exports.createPandel = exports.getPandelById = exports.getPandels = void 0;
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const products_1 = require("../../models/schema/admin/products");
const pandels_1 = require("../../models/schema/admin/pandels");
const deleteImage_1 = require("../../utils/deleteImage");
const producthelper_1 = require("../../utils/producthelper");
const getPandels = async (req, res) => {
    const pandels = await pandels_1.PandelModel.find({ status: true }).populate('productsId', 'name price');
    return (0, response_1.SuccessResponse)(res, { message: "Pandels found successfully", pandels });
};
exports.getPandels = getPandels;
const getPandelById = async (req, res) => {
    const { id } = req.params;
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const pandel = await pandels_1.PandelModel.findById(id).lean();
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    // هات الـ Products كاملة بالـ Variations
    const products = await (0, producthelper_1.buildProductsWithVariations)({
        filter: { _id: { $in: pandel.productsId } },
        warehouseId,
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Pandel found successfully",
        pandel: {
            ...pandel,
            products,
        },
    });
};
exports.getPandelById = getPandelById;
const createPandel = async (req, res) => {
    const { name, productsId, images, startdate, enddate, status, price } = req.body;
    if (!name || !productsId || !images || !startdate || !enddate || status === true || !price)
        throw new BadRequest_1.BadRequest("All fields are required");
    const imageUrls = [];
    for (const [index, base64Image] of images.entries()) {
        const imageUrl = await (0, handleImages_1.saveBase64Image)(base64Image, `${Date.now()}_${index}`, req, "pandels");
        imageUrls.push(imageUrl);
    }
    const existingProducts = await products_1.ProductModel.find({ _id: { $in: productsId } });
    if (existingProducts.length !== productsId.length) {
        throw new BadRequest_1.BadRequest("Some products not found");
    }
    const existingPandel = await pandels_1.PandelModel.findOne({ name });
    if (existingPandel) {
        throw new BadRequest_1.BadRequest("Pandel name already exists");
    }
    const pandel = await pandels_1.PandelModel.create({ name, productsId, images: imageUrls, startdate, enddate, status, price });
    return (0, response_1.SuccessResponse)(res, { message: "Pandel created successfully", pandel });
};
exports.createPandel = createPandel;
const updatePandel = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const updateData = { ...req.body };
    if (req.body.images) {
        const imageUrls = [];
        for (const [index, base64Image] of req.body.images.entries()) {
            const imageUrl = await (0, handleImages_1.saveBase64Image)(base64Image, `${Date.now()}_${index}`, req, "pandels");
            imageUrls.push(imageUrl);
        }
        updateData.images = imageUrls;
    }
    if (req.body.productsId) {
        const existingProducts = await products_1.ProductModel.find({ _id: { $in: req.body.productsId } });
        if (existingProducts.length !== req.body.productsId.length) {
            throw new BadRequest_1.BadRequest("Some products not found");
        }
    }
    const pandel = await pandels_1.PandelModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    return (0, response_1.SuccessResponse)(res, { message: "Pandel updated successfully", pandel });
};
exports.updatePandel = updatePandel;
const deletePandel = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const pandel = await pandels_1.PandelModel.findByIdAndDelete(id);
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    // Delete images from server
    for (const imageUrl of pandel.images) {
        await (0, deleteImage_1.deletePhotoFromServer)(imageUrl); // ← بدون req
    }
    return (0, response_1.SuccessResponse)(res, { message: "Pandel deleted successfully" });
};
exports.deletePandel = deletePandel;
// get active bundles (pandels) for POS
const getActiveBundles = async (req, res) => {
    const currentDate = new Date();
    // جلب الـ Bundles النشطة فقط (في نطاق التاريخ)
    const bundles = await pandels_1.PandelModel.find({
        status: true,
        startdate: { $lte: currentDate },
        enddate: { $gte: currentDate },
    }).populate("productsId", "name price image ar_name");
    // حساب السعر الأصلي ونسبة التوفير
    const bundlesWithPricing = bundles.map((bundle) => {
        const products = bundle.productsId;
        // حساب السعر الأصلي (مجموع أسعار المنتجات)
        const originalPrice = products.reduce((sum, product) => {
            return sum + (product.price || 0);
        }, 0);
        // حساب التوفير
        const savings = originalPrice - bundle.price;
        const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
        return {
            _id: bundle._id,
            name: bundle.name,
            images: bundle.images,
            products: products.map((p) => ({
                _id: p._id,
                name: p.name,
                ar_name: p.ar_name,
                price: p.price,
                image: p.image,
            })),
            originalPrice: originalPrice,
            bundlePrice: bundle.price,
            savings: savings,
            savingsPercentage: savingsPercentage,
            startdate: bundle.startdate,
            enddate: bundle.enddate,
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Active bundles",
        bundles: bundlesWithPricing,
    });
};
exports.getActiveBundles = getActiveBundles;
