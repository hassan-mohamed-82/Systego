"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsforselect = exports.generateProductCode = exports.generateBarcodeImageController = exports.getProductByCode = exports.getOneProduct = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.createProduct = void 0;
const products_1 = require("../../models/schema/admin/products");
const product_price_1 = require("../../models/schema/admin/product_price");
const product_price_2 = require("../../models/schema/admin/product_price");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const handleImages_1 = require("../../utils/handleImages");
const barcode_1 = require("../../utils/barcode");
const category_1 = require("../../models/schema/admin/category");
const brand_1 = require("../../models/schema/admin/brand");
const Variation_1 = require("../../models/schema/admin/Variation");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const createProduct = async (req, res) => {
    const { name, ar_name, image, categoryId, brandId, unit, price, quantity, ar_description, description, exp_ability, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery_product, is_featured, code, } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Product name is required");
    if (!ar_name)
        throw new BadRequest_1.BadRequest("Arabic name is required");
    if (!ar_description)
        throw new BadRequest_1.BadRequest("Arabic description is required");
    const hasVariations = Array.isArray(prices) && prices.length > 0;
    if (!hasVariations) {
        if (price === undefined || price === null) {
            throw new BadRequest_1.BadRequest("Product price is required when there are no variations");
        }
        if (quantity === undefined || quantity === null) {
            throw new BadRequest_1.BadRequest("Product quantity is required when there are no variations");
        }
        if (!code) {
            throw new BadRequest_1.BadRequest("Product code is required when there are no variations");
        }
        const existingProductWithCode = await products_1.ProductModel.findOne({ code });
        if (existingProductWithCode) {
            throw new BadRequest_1.BadRequest("Product code already exists");
        }
    }
    if (!Array.isArray(categoryId) || categoryId.length === 0) {
        throw new BadRequest_1.BadRequest("At least one categoryId is required");
    }
    const existitcategories = await category_1.CategoryModel.find({
        _id: { $in: categoryId },
    });
    if (existitcategories.length !== categoryId.length) {
        throw new BadRequest_1.BadRequest("One or more categories not found");
    }
    if (brandId) {
        const existitbrand = await brand_1.BrandModel.findById(brandId);
        if (!existitbrand)
            throw new BadRequest_1.BadRequest("Brand not found");
    }
    for (const cat of existitcategories) {
        cat.product_quantity += 1;
        await cat.save();
    }
    let imageUrl;
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    let galleryUrls = [];
    if (gallery_product && Array.isArray(gallery_product)) {
        for (const g of gallery_product) {
            if (typeof g === "string") {
                const imgUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "products");
                galleryUrls.push(imgUrl);
            }
        }
    }
    if (show_quantity && !maximum_to_show) {
        throw new BadRequest_1.BadRequest("Maximum to show is required when show_quantity is true");
    }
    const basePrice = hasVariations ? 0 : Number(price);
    const baseQuantity = hasVariations ? 0 : Number(quantity || 0);
    const product = await products_1.ProductModel.create({
        name,
        ar_name,
        ar_description,
        image: imageUrl,
        categoryId,
        brandId,
        unit,
        code,
        price: basePrice,
        quantity: baseQuantity,
        description,
        exp_ability,
        minimum_quantity_sale,
        low_stock,
        whole_price,
        start_quantaty,
        taxesId,
        product_has_imei,
        different_price,
        show_quantity,
        maximum_to_show,
        gallery_product: galleryUrls,
        is_featured,
    });
    if (hasVariations) {
        let totalQuantity = 0;
        let minVariantPrice = null;
        for (const p of prices) {
            if (p.price === undefined || p.price === null) {
                throw new BadRequest_1.BadRequest("Each variation must have a price");
            }
            if (!p.code) {
                throw new BadRequest_1.BadRequest("Each variation must have a unique code");
            }
            const variantPrice = Number(p.price);
            const variantQty = Number(p.quantity || 0);
            let priceGalleryUrls = [];
            if (p.gallery && Array.isArray(p.gallery)) {
                for (const g of p.gallery) {
                    if (typeof g === "string") {
                        const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                        priceGalleryUrls.push(gUrl);
                    }
                }
            }
            const productPrice = await product_price_1.ProductPriceModel.create({
                productId: product._id,
                price: variantPrice,
                code: p.code,
                gallery: priceGalleryUrls,
                quantity: variantQty,
            });
            totalQuantity += variantQty;
            if (minVariantPrice === null || variantPrice < minVariantPrice) {
                minVariantPrice = variantPrice;
            }
            if (p.options && Array.isArray(p.options)) {
                for (const opt of p.options) {
                    await product_price_2.ProductPriceOptionModel.create({
                        product_price_id: productPrice._id,
                        option_id: opt,
                    });
                }
            }
        }
        product.quantity = totalQuantity;
        product.price = minVariantPrice ?? 0;
        await product.save();
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Product created successfully",
        product,
    });
};
exports.createProduct = createProduct;
const getProduct = async (req, res) => {
    const products = await products_1.ProductModel.find()
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    const variations = await Variation_1.VariationModel.find().lean();
    const formattedProducts = await Promise.all(products.map(async (product) => {
        const prices = await product_price_1.ProductPriceModel.find({ productId: product._id }).lean();
        const formattedPrices = await Promise.all(prices.map(async (price) => {
            const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: price._id })
                .populate({
                path: "option_id",
                select: "_id name variationId",
            })
                .lean();
            const groupedOptions = {};
            for (const po of options) {
                const option = po.option_id;
                if (!option?._id)
                    continue;
                const variation = variations.find((v) => v._id.toString() === option.variationId?.toString());
                if (variation) {
                    if (!groupedOptions[variation.name])
                        groupedOptions[variation.name] = [];
                    groupedOptions[variation.name].push(option);
                }
            }
            const variationsArray = Object.keys(groupedOptions).map((varName) => ({
                name: varName,
                options: groupedOptions[varName],
            }));
            return {
                ...price,
                variations: variationsArray,
            };
        }));
        return { ...product, prices: formattedPrices };
    }));
    (0, response_1.SuccessResponse)(res, { products: formattedProducts });
};
exports.getProduct = getProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, ar_name, image, categoryId, brandId, unit, price, description, ar_description, exp_ability, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery, is_featured, } = req.body;
    const product = await products_1.ProductModel.findById(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    if (image) {
        product.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    if (gallery && Array.isArray(gallery)) {
        let galleryUrles = [];
        for (const g of gallery) {
            if (typeof g === "string") {
                const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                galleryUrles.push(gUrl);
            }
        }
        product.gallery_product = galleryUrles;
    }
    product.name = name ?? product.name;
    product.ar_name = ar_name ?? product.ar_name;
    product.categoryId = categoryId ?? product.categoryId;
    product.brandId = brandId ?? product.brandId;
    product.unit = unit ?? product.unit;
    product.price = price ?? product.price;
    product.description = description ?? product.description;
    product.ar_description = ar_description ?? product.ar_description;
    product.exp_ability = exp_ability ?? product.exp_ability;
    product.minimum_quantity_sale = minimum_quantity_sale ?? product.minimum_quantity_sale;
    product.low_stock = low_stock ?? product.low_stock;
    product.whole_price = whole_price ?? product.whole_price;
    product.start_quantaty = start_quantaty ?? product.start_quantaty;
    product.taxesId = taxesId ?? product.taxesId;
    product.product_has_imei = product_has_imei ?? product.product_has_imei;
    product.different_price = different_price ?? product.different_price;
    product.show_quantity = show_quantity ?? product.show_quantity;
    product.maximum_to_show = maximum_to_show ?? product.maximum_to_show;
    product.is_featured = is_featured ?? product.is_featured;
    await product.save();
    let totalQuantity = 0;
    if (prices && Array.isArray(prices)) {
        for (const p of prices) {
            let productPrice;
            if (p._id) {
                productPrice = await product_price_1.ProductPriceModel.findByIdAndUpdate(p._id, { price: p.price, code: p.code, quantity: p.quantity || 0 }, { new: true });
            }
            else {
                let galleryUrls = [];
                if (p.gallery && Array.isArray(p.gallery)) {
                    for (const g of p.gallery) {
                        if (typeof g === "string") {
                            const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                            galleryUrls.push(gUrl);
                        }
                    }
                }
                productPrice = await product_price_1.ProductPriceModel.create({
                    productId: product._id,
                    price: p.price,
                    code: p.code,
                    quantity: p.quantity || 0,
                    gallery: galleryUrls,
                });
            }
            totalQuantity += p.quantity || 0;
            if (productPrice && p.options && Array.isArray(p.options)) {
                await product_price_2.ProductPriceOptionModel.deleteMany({ product_price_id: productPrice._id });
                for (const opt of p.options) {
                    await product_price_2.ProductPriceOptionModel.create({
                        product_price_id: productPrice._id,
                        option_id: opt,
                    });
                }
            }
        }
    }
    product.quantity = totalQuantity;
    await product.save();
    (0, response_1.SuccessResponse)(res, { message: "Product updated successfully", product });
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const product = await products_1.ProductModel.findByIdAndDelete(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const prices = await product_price_1.ProductPriceModel.find({ productId: id });
    const priceIds = prices.map((p) => p._id);
    await product_price_2.ProductPriceOptionModel.deleteMany({ product_price_id: { $in: priceIds } });
    await product_price_1.ProductPriceModel.deleteMany({ productId: id });
    (0, response_1.SuccessResponse)(res, { message: "Product and all related prices/options deleted successfully" });
};
exports.deleteProduct = deleteProduct;
const getOneProduct = async (req, res) => {
    const { id } = req.params;
    const product = await products_1.ProductModel.findById(id)
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const variations = await Variation_1.VariationModel.find().lean();
    const prices = await product_price_1.ProductPriceModel.find({ productId: product._id }).lean();
    const formattedPrices = await Promise.all(prices.map(async (price) => {
        const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: price._id })
            .populate({
            path: "option_id",
            select: "_id name variationId",
        })
            .lean();
        const groupedOptions = {};
        for (const po of options) {
            const option = po.option_id;
            if (!option?._id)
                continue;
            const variation = variations.find((v) => v._id.toString() === option.variationId?.toString());
            if (variation) {
                if (!groupedOptions[variation.name])
                    groupedOptions[variation.name] = [];
                groupedOptions[variation.name].push({
                    _id: option._id,
                    name: option.name,
                });
            }
        }
        const variationsArray = Object.keys(groupedOptions).map((varName) => ({
            name: varName,
            options: groupedOptions[varName],
        }));
        return {
            _id: price._id,
            productId: price.productId,
            price: price.price,
            code: price.code,
            gallery: price.gallery,
            quantity: price.quantity,
            createdAt: price.createdAt,
            updatedAt: price.updatedAt,
            __v: price.__v,
            variations: variationsArray,
        };
    }));
    product.prices = formattedPrices;
    (0, response_1.SuccessResponse)(res, {
        product,
        message: "Product fetched successfully",
    });
};
exports.getOneProduct = getOneProduct;
const getProductByCode = async (req, res) => {
    const { code } = req.body;
    if (!code)
        throw new BadRequest_1.BadRequest("Code is required");
    const productPrice = await product_price_1.ProductPriceModel.findOne({ code }).lean();
    if (!productPrice)
        throw new NotFound_1.NotFound("No product found for this code");
    const product = await products_1.ProductModel.findById(productPrice.productId)
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const variations = await Variation_1.VariationModel.find().populate("options").lean();
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: productPrice._id })
        .populate("option_id")
        .lean();
    const groupedOptions = {};
    options.forEach((po) => {
        const option = po.option_id;
        if (!option || !option._id)
            return;
        const variation = variations.find((v) => v.options.some((opt) => opt._id.toString() === option._id.toString()));
        if (variation) {
            if (!groupedOptions[variation.name])
                groupedOptions[variation.name] = [];
            groupedOptions[variation.name].push(option);
        }
    });
    const variationsArray = Object.keys(groupedOptions).map((varName) => ({
        name: varName,
        options: groupedOptions[varName],
    }));
    product.price = {
        ...productPrice,
        variations: variationsArray,
    };
    (0, response_1.SuccessResponse)(res, {
        product,
        categories,
        brands,
        variations,
    });
};
exports.getProductByCode = getProductByCode;
const generateBarcodeImageController = async (req, res) => {
    const { product_price_id } = req.params;
    if (!product_price_id)
        throw new BadRequest_1.BadRequest("Product price ID is required");
    const productPrice = await product_price_1.ProductPriceModel.findById(product_price_id);
    if (!productPrice)
        throw new NotFound_1.NotFound("Product price not found");
    const productCode = productPrice.code;
    if (!productCode)
        throw new BadRequest_1.BadRequest("Product price does not have a code yet");
    const imageLink = await (0, barcode_1.generateBarcodeImage)(productCode, productCode);
    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;
    (0, response_1.SuccessResponse)(res, {
        image: fullImageUrl,
        code: productCode,
    });
};
exports.generateBarcodeImageController = generateBarcodeImageController;
const generateProductCode = async (req, res) => {
    let newCode = (0, barcode_1.generateEAN13Barcode)();
    while (await product_price_1.ProductPriceModel.findOne({ code: newCode })) {
        newCode = (0, barcode_1.generateEAN13Barcode)();
    }
    (0, response_1.SuccessResponse)(res, { code: newCode });
};
exports.generateProductCode = generateProductCode;
const modelsforselect = async (req, res) => {
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    const variations = await Variation_1.VariationModel.find().lean().populate("options");
    const warehouses = await Warehouse_1.WarehouseModel.find().lean();
    (0, response_1.SuccessResponse)(res, { categories, brands, variations, warehouses });
};
exports.modelsforselect = modelsforselect;
