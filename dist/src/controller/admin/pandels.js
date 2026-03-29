"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePandel = exports.updatePandel = exports.createPandel = exports.getPandelById = exports.getPandels = void 0;
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const products_1 = require("../../models/schema/admin/products");
const pandels_1 = require("../../models/schema/admin/pandels");
const product_price_1 = require("../../models/schema/admin/product_price");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const deleteImage_1 = require("../../utils/deleteImage");
const mongoose_1 = __importDefault(require("mongoose"));
const normalizeWarehouseSelection = async (payload, jwtUser, existingBundle) => {
    const allWarehousesRequested = payload?.all_warehouses === true;
    const hasWarehouseIdsArray = Array.isArray(payload?.warehouse_ids) && payload.warehouse_ids.length > 0;
    const hasSingleWarehouseId = !!payload?.warehouse_id;
    if (allWarehousesRequested && (hasSingleWarehouseId || hasWarehouseIdsArray)) {
        throw new BadRequest_1.BadRequest("Do not send warehouse_id or warehouse_ids when all_warehouses is true");
    }
    if (hasSingleWarehouseId && hasWarehouseIdsArray) {
        throw new BadRequest_1.BadRequest("Use either warehouse_id or warehouse_ids, not both");
    }
    let allWarehouses = false;
    let warehouseIds = [];
    if (allWarehousesRequested) {
        const allWarehousesDocs = await Warehouse_1.WarehouseModel.find({}).select("_id").lean();
        if (!allWarehousesDocs.length) {
            throw new BadRequest_1.BadRequest("No warehouses found in system");
        }
        allWarehouses = true;
        warehouseIds = allWarehousesDocs.map((w) => w._id.toString());
    }
    else if (hasWarehouseIdsArray) {
        warehouseIds = payload.warehouse_ids
            .filter((id) => !!id)
            .map((id) => String(id));
    }
    else if (hasSingleWarehouseId) {
        warehouseIds = [String(payload.warehouse_id)];
    }
    else if (existingBundle) {
        const storedAll = existingBundle.all_warehouses === true;
        const storedWarehouseIds = Array.isArray(existingBundle.warehouse_ids)
            ? existingBundle.warehouse_ids.map((id) => String(id))
            : [];
        if (storedAll) {
            const allWarehousesDocs = await Warehouse_1.WarehouseModel.find({}).select("_id").lean();
            if (!allWarehousesDocs.length) {
                throw new BadRequest_1.BadRequest("No warehouses found in system");
            }
            allWarehouses = true;
            warehouseIds = allWarehousesDocs.map((w) => w._id.toString());
        }
        else if (storedWarehouseIds.length > 0) {
            warehouseIds = storedWarehouseIds;
        }
    }
    else if (jwtUser?.warehouse_id) {
        warehouseIds = [String(jwtUser.warehouse_id)];
    }
    warehouseIds = Array.from(new Set(warehouseIds));
    if (!allWarehouses && warehouseIds.length === 0) {
        throw new BadRequest_1.BadRequest("Please select one or more warehouses, or set all_warehouses = true");
    }
    for (const id of warehouseIds) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new BadRequest_1.BadRequest(`Invalid warehouse id: ${id}`);
        }
    }
    const existingWarehouses = await Warehouse_1.WarehouseModel.find({ _id: { $in: warehouseIds } })
        .select("_id")
        .lean();
    if (existingWarehouses.length !== warehouseIds.length) {
        throw new BadRequest_1.BadRequest("One or more selected warehouses do not exist");
    }
    return {
        allWarehouses,
        warehouseIds,
    };
};
const validateProductsInWarehouses = async (products, warehouseIds) => {
    const validatedProducts = [];
    for (const p of products) {
        if (!p.productId) {
            throw new BadRequest_1.BadRequest("Each product must have productId");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(p.productId)) {
            throw new BadRequest_1.BadRequest(`Invalid productId: ${p.productId}`);
        }
        const product = await products_1.ProductModel.findById(p.productId);
        if (!product) {
            throw new BadRequest_1.BadRequest(`Product ${p.productId} not found`);
        }
        if (p.productPriceId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(p.productPriceId)) {
                throw new BadRequest_1.BadRequest(`Invalid productPriceId: ${p.productPriceId}`);
            }
            const productPrice = await product_price_1.ProductPriceModel.findOne({
                _id: p.productPriceId,
                productId: p.productId,
            });
            if (!productPrice) {
                throw new BadRequest_1.BadRequest(`ProductPrice ${p.productPriceId} not found or doesn't belong to product ${p.productId}`);
            }
        }
        else {
            const warehousesStock = await Product_Warehouse_1.Product_WarehouseModel.find({
                productId: p.productId,
                warehouseId: { $in: warehouseIds },
            })
                .select("warehouseId")
                .lean();
            const existingWarehouseIds = new Set(warehousesStock.map((ws) => ws.warehouseId.toString()));
            const missingWarehouseIds = warehouseIds.filter((wid) => !existingWarehouseIds.has(wid));
            if (missingWarehouseIds.length > 0) {
                throw new BadRequest_1.BadRequest(`Product ${product.name || p.productId} is not assigned to all selected warehouses. Missing in warehouses: ${missingWarehouseIds.join(", ")}`);
            }
        }
        validatedProducts.push({
            productId: p.productId,
            productPriceId: p.productPriceId || null,
            quantity: p.quantity || 1,
        });
    }
    return validatedProducts;
};
// ═══════════════════════════════════════════════════════════
// 📦 GET ALL PANDELS (Admin)
// ═══════════════════════════════════════════════════════════
const getPandels = async (req, res) => {
    const pandels = await pandels_1.PandelModel.find({ status: true })
        .populate({
        path: "products.productId",
        select: "name ar_name price image",
    })
        .populate({
        path: "products.productPriceId",
        select: "price code",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Pandels found successfully",
        pandels,
    });
};
exports.getPandels = getPandels;
// ═══════════════════════════════════════════════════════════
// 📦 GET PANDEL BY ID (Admin)
// ═══════════════════════════════════════════════════════════
const getPandelById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const pandel = await pandels_1.PandelModel.findById(id)
        .populate({
        path: "products.productId",
        select: "name ar_name price image",
    })
        .populate({
        path: "products.productPriceId",
        select: "price code",
    })
        .lean();
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    // جلب كل الـ Variations لكل منتج
    const productsWithVariations = await Promise.all((pandel.products || []).map(async (p) => {
        const variations = await product_price_1.ProductPriceModel.find({
            productId: p.productId?._id || p.productId,
        })
            .select("price code quantity")
            .lean();
        // جلب Options لكل Variation
        const variationsWithOptions = await Promise.all(variations.map(async (v) => {
            const options = await product_price_1.ProductPriceOptionModel.find({
                product_price_id: v._id,
            })
                .populate("option_id", "name ar_name")
                .lean();
            return {
                ...v,
                options: options.map((o) => o.option_id),
            };
        }));
        return {
            ...p,
            availableVariations: variationsWithOptions,
            hasVariations: variationsWithOptions.length > 0,
        };
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Pandel found successfully",
        pandel: {
            ...pandel,
            products: productsWithVariations,
        },
    });
};
exports.getPandelById = getPandelById;
// ═══════════════════════════════════════════════════════════
// ➕ CREATE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
const createPandel = async (req, res) => {
    const { name, products, images, startdate, enddate, status = true, price } = req.body;
    const jwtUser = req.user;
    // Validation
    if (!name)
        throw new BadRequest_1.BadRequest("Name is required");
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequest_1.BadRequest("At least one product is required");
    }
    if (!startdate)
        throw new BadRequest_1.BadRequest("Start date is required");
    if (!enddate)
        throw new BadRequest_1.BadRequest("End date is required");
    if (!price || price <= 0)
        throw new BadRequest_1.BadRequest("Valid price is required");
    const { allWarehouses, warehouseIds } = await normalizeWarehouseSelection(req.body, jwtUser);
    const validatedProducts = await validateProductsInWarehouses(products, warehouseIds);
    // Check duplicate name
    const existingPandel = await pandels_1.PandelModel.findOne({ name });
    if (existingPandel) {
        throw new BadRequest_1.BadRequest("Pandel name already exists");
    }
    // Save images
    let imageUrls = [];
    if (images && Array.isArray(images) && images.length > 0) {
        for (const [index, base64Image] of images.entries()) {
            if (base64Image && base64Image.startsWith("data:image")) {
                const imageUrl = await (0, handleImages_1.saveBase64Image)(base64Image, `${Date.now()}_${index}`, req, "pandels");
                imageUrls.push(imageUrl);
            }
            else if (base64Image) {
                imageUrls.push(base64Image);
            }
        }
    }
    // Create Pandel
    const pandel = await pandels_1.PandelModel.create({
        name,
        products: validatedProducts,
        all_warehouses: allWarehouses,
        warehouse_ids: allWarehouses ? [] : warehouseIds,
        images: imageUrls,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status,
        price,
    });
    // Populate and return
    const populatedPandel = await pandels_1.PandelModel.findById(pandel._id)
        .populate({
        path: "products.productId",
        select: "name ar_name price image",
    })
        .populate({
        path: "products.productPriceId",
        select: "price code",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Pandel created successfully",
        pandel: populatedPandel,
    });
};
exports.createPandel = createPandel;
// ═══════════════════════════════════════════════════════════
// ✏️ UPDATE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
const updatePandel = async (req, res) => {
    const { id } = req.params;
    const jwtUser = req.user;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const pandel = await pandels_1.PandelModel.findById(id);
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    const hasWarehouseSelectionInBody = req.body.all_warehouses !== undefined ||
        req.body.warehouse_id !== undefined ||
        req.body.warehouse_ids !== undefined;
    const { allWarehouses, warehouseIds } = await normalizeWarehouseSelection(req.body, jwtUser, pandel);
    const updateData = {};
    // Update name
    if (req.body.name !== undefined) {
        const existingPandel = await pandels_1.PandelModel.findOne({
            name: req.body.name,
            _id: { $ne: id },
        });
        if (existingPandel) {
            throw new BadRequest_1.BadRequest("Pandel name already exists");
        }
        updateData.name = req.body.name;
    }
    // Update products
    if (req.body.products) {
        const validatedProducts = await validateProductsInWarehouses(req.body.products, warehouseIds);
        updateData.products = validatedProducts;
    }
    else if (hasWarehouseSelectionInBody) {
        const existingProducts = Array.isArray(pandel.products) ? pandel.products : [];
        await validateProductsInWarehouses(existingProducts, warehouseIds);
    }
    if (hasWarehouseSelectionInBody) {
        updateData.all_warehouses = allWarehouses;
        updateData.warehouse_ids = allWarehouses ? [] : warehouseIds;
    }
    // Update images
    if (req.body.images) {
        const imageUrls = [];
        for (const [index, base64Image] of req.body.images.entries()) {
            if (base64Image && base64Image.startsWith("data:image")) {
                const imageUrl = await (0, handleImages_1.saveBase64Image)(base64Image, `${Date.now()}_${index}`, req, "pandels");
                imageUrls.push(imageUrl);
            }
            else if (base64Image) {
                imageUrls.push(base64Image);
            }
        }
        updateData.images = imageUrls;
    }
    // Update other fields
    if (req.body.startdate !== undefined)
        updateData.startdate = new Date(req.body.startdate);
    if (req.body.enddate !== undefined)
        updateData.enddate = new Date(req.body.enddate);
    if (req.body.status !== undefined)
        updateData.status = req.body.status;
    if (req.body.price !== undefined)
        updateData.price = req.body.price;
    const updatedPandel = await pandels_1.PandelModel.findByIdAndUpdate(id, updateData, { new: true })
        .populate({
        path: "products.productId",
        select: "name ar_name price image",
    })
        .populate({
        path: "products.productPriceId",
        select: "price code",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Pandel updated successfully",
        pandel: updatedPandel,
    });
};
exports.updatePandel = updatePandel;
// ═══════════════════════════════════════════════════════════
// 🗑️ DELETE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
const deletePandel = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Pandel id is required");
    const pandel = await pandels_1.PandelModel.findByIdAndDelete(id);
    if (!pandel)
        throw new Errors_1.NotFound("Pandel not found");
    // Delete images from server
    for (const imageUrl of pandel.images || []) {
        await (0, deleteImage_1.deletePhotoFromServer)(imageUrl);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Pandel deleted successfully" });
};
exports.deletePandel = deletePandel;
// ═══════════════════════════════════════════════════════════
// 🛒 GET ACTIVE BUNDLES FOR POS (مع الـ Variations)
// ═══════════════════════════════════════════════════════════
