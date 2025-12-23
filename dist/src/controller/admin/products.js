"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockProducts = exports.deletemanyproducts = exports.importProductsFromExcel = exports.modelsforselect = exports.generateProductCode = exports.generateBarcodeImageController = exports.getProductByCode = exports.getOneProduct = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.createProduct = void 0;
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
const exceljs_1 = __importDefault(require("exceljs"));
const units_1 = require("../../models/schema/admin/units");
const Taxes_1 = require("../../models/schema/admin/Taxes");
const createProduct = async (req, res) => {
    const { name, ar_name, image, categoryId, brandId, product_unit, sale_unit, purchase_unit, price, quantity, ar_description, description, exp_ability, minimum_quantity_sale, low_stock, cost, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery_product, is_featured, code, } = req.body;
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
        product_unit,
        sale_unit,
        purchase_unit,
        code,
        price: basePrice,
        quantity: baseQuantity,
        description,
        cost,
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
            const variantCost = Number(p.cost || 0);
            const variantStartQty = Number(p.strat_quantaty || 0);
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
                cost: variantCost,
                strat_quantaty: variantStartQty,
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
    const { name, ar_name, image, categoryId, brandId, product_unit, sale_unit, purchase_unit, cost, price, description, ar_description, exp_ability, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery, is_featured, } = req.body;
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
    product.product_unit = product_unit ?? product.product_unit;
    product.sale_unit = sale_unit ?? product.sale_unit;
    product.purchase_unit = purchase_unit ?? product.purchase_unit;
    product.price = price ?? product.price;
    product.description = description ?? product.description;
    product.ar_description = ar_description ?? product.ar_description;
    product.exp_ability = exp_ability ?? product.exp_ability;
    product.minimum_quantity_sale = minimum_quantity_sale ?? product.minimum_quantity_sale;
    product.low_stock = low_stock ?? product.low_stock;
    product.whole_price = whole_price ?? product.whole_price;
    product.start_quantaty = start_quantaty ?? product.start_quantaty;
    product.cost = cost ?? product.cost;
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
                productPrice = await product_price_1.ProductPriceModel.findByIdAndUpdate(p._id, {
                    price: p.price,
                    code: p.code,
                    quantity: p.quantity || 0,
                    cost: p.cost || 0,
                    strat_quantaty: p.strat_quantaty || 0,
                }, { new: true });
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
                    cost: p.cost || 0,
                    strat_quantaty: p.strat_quantaty || 0,
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
            cost: price.cost,
            strat_quantaty: price.strat_quantaty,
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
    const units = await units_1.UnitModel.find().lean();
    (0, response_1.SuccessResponse)(res, { categories, brands, variations, warehouses });
};
exports.modelsforselect = modelsforselect;
// ═══════════════════════════════════════════════════════════
// IMPORT PRODUCTS FROM EXCEL
// ═══════════════════════════════════════════════════════════
const importProductsFromExcel = async (req, res) => {
    if (!req.file) {
        throw new BadRequest_1.BadRequest("Excel file is required");
    }
    const workbook = new exceljs_1.default.Workbook();
    const arrayBuffer = req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength);
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
        throw new BadRequest_1.BadRequest("Invalid Excel file");
    }
    // اقرأ الـ headers
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim().toLowerCase() || "";
    });
    // Mapping للأعمدة
    const findColumn = (names) => {
        for (const name of names) {
            const index = headers.findIndex(h => h === name.toLowerCase());
            if (index !== -1)
                return index;
        }
        return -1;
    };
    const cols = {
        name: findColumn(["name", "product name", "اسم المنتج"]),
        ar_name: findColumn(["ar_name", "arabic name", "الاسم بالعربي"]),
        ar_description: findColumn(["ar_description", "arabic description", "الوصف بالعربي"]),
        description: findColumn(["description", "الوصف"]),
        category: findColumn(["category", "categories", "القسم", "التصنيف"]),
        brand: findColumn(["brand", "الماركة"]),
        code: findColumn(["code", "sku", "barcode", "الكود"]),
        price: findColumn(["price", "selling price", "سعر البيع"]),
        cost: findColumn(["cost", "purchase price", "التكلفة", "سعر الشراء"]),
        quantity: findColumn(["quantity", "qty", "stock", "الكمية"]),
        low_stock: findColumn(["low_stock", "low stock", "الحد الأدنى"]),
        whole_price: findColumn(["whole_price", "wholesale price", "سعر الجملة"]),
        start_quantaty: findColumn(["start_quantaty", "start quantity", "كمية البداية"]),
        minimum_quantity_sale: findColumn(["minimum_quantity_sale", "min sale qty", "أقل كمية بيع"]),
        product_unit: findColumn(["product_unit", "unit", "الوحدة"]),
        sale_unit: findColumn(["sale_unit", "وحدة البيع"]),
        purchase_unit: findColumn(["purchase_unit", "وحدة الشراء"]),
        taxes: findColumn(["taxes", "tax", "الضريبة"]),
        exp_ability: findColumn(["exp_ability", "has expiry", "قابل للانتهاء"]),
        product_has_imei: findColumn(["product_has_imei", "has imei", "له سيريال"]),
        different_price: findColumn(["different_price", "سعر مختلف"]),
        show_quantity: findColumn(["show_quantity", "اظهار الكمية"]),
        maximum_to_show: findColumn(["maximum_to_show", "max to show", "أقصى كمية للعرض"]),
        is_featured: findColumn(["is_featured", "featured", "مميز"]),
        image: findColumn(["image", "photo", "الصورة"]),
        gallery_product: findColumn(["gallery_product", "gallery", "معرض الصور"]),
    };
    // Helper functions
    const getValue = (row, colIndex) => {
        if (colIndex === -1)
            return "";
        return row.getCell(colIndex + 1).value?.toString().trim() || "";
    };
    const getNumber = (row, colIndex) => {
        if (colIndex === -1)
            return 0;
        return Number(row.getCell(colIndex + 1).value) || 0;
    };
    const getBoolean = (row, colIndex) => {
        if (colIndex === -1)
            return false;
        const val = row.getCell(colIndex + 1).value?.toString().toLowerCase().trim();
        return val === "true" || val === "1" || val === "yes" || val === "نعم";
    };
    const products = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return;
        // Fallback للأعمدة الثابتة لو مفيش headers
        const name = cols.name !== -1 ? getValue(row, cols.name) : row.getCell(1).value?.toString().trim() || "";
        const ar_name = cols.ar_name !== -1 ? getValue(row, cols.ar_name) : row.getCell(2).value?.toString().trim() || "";
        if (name) {
            products.push({
                name,
                ar_name: ar_name || name,
                ar_description: cols.ar_description !== -1 ? getValue(row, cols.ar_description) : row.getCell(3).value?.toString().trim() || "",
                description: cols.description !== -1 ? getValue(row, cols.description) : row.getCell(4).value?.toString().trim() || "",
                category: cols.category !== -1 ? getValue(row, cols.category) : row.getCell(5).value?.toString().trim() || "",
                brand: cols.brand !== -1 ? getValue(row, cols.brand) : row.getCell(6).value?.toString().trim() || "",
                code: cols.code !== -1 ? getValue(row, cols.code) : row.getCell(7).value?.toString().trim() || "",
                price: cols.price !== -1 ? getNumber(row, cols.price) : Number(row.getCell(8).value) || 0,
                cost: cols.cost !== -1 ? getNumber(row, cols.cost) : Number(row.getCell(9).value) || 0,
                quantity: cols.quantity !== -1 ? getNumber(row, cols.quantity) : Number(row.getCell(10).value) || 0,
                low_stock: cols.low_stock !== -1 ? getNumber(row, cols.low_stock) : Number(row.getCell(12).value) || 0,
                whole_price: getNumber(row, cols.whole_price),
                start_quantaty: getNumber(row, cols.start_quantaty),
                minimum_quantity_sale: getNumber(row, cols.minimum_quantity_sale) || 1,
                product_unit: getValue(row, cols.product_unit),
                sale_unit: getValue(row, cols.sale_unit),
                purchase_unit: getValue(row, cols.purchase_unit),
                taxes: getValue(row, cols.taxes),
                exp_ability: getBoolean(row, cols.exp_ability),
                product_has_imei: getBoolean(row, cols.product_has_imei),
                different_price: getBoolean(row, cols.different_price),
                show_quantity: cols.show_quantity !== -1 ? getBoolean(row, cols.show_quantity) : true,
                maximum_to_show: getNumber(row, cols.maximum_to_show),
                is_featured: getBoolean(row, cols.is_featured),
                image: cols.image !== -1 ? getValue(row, cols.image) : row.getCell(13).value?.toString().trim() || "",
                gallery_product: getValue(row, cols.gallery_product),
            });
        }
    });
    if (products.length === 0) {
        throw new BadRequest_1.BadRequest("No valid products found in the file");
    }
    const results = {
        success: [],
        failed: [],
        skipped: [],
    };
    // Cache all lookups
    const existingCategories = await category_1.CategoryModel.find({}).lean();
    const categoryMap = {};
    existingCategories.forEach((cat) => {
        categoryMap[cat.name.toLowerCase()] = cat._id.toString();
    });
    const existingBrands = await brand_1.BrandModel.find({}).lean();
    const brandMap = {};
    existingBrands.forEach((brand) => {
        brandMap[brand.name.toLowerCase()] = brand._id.toString();
    });
    const existingUnits = await units_1.UnitModel.find({}).lean();
    const unitMap = {};
    existingUnits.forEach((unit) => {
        unitMap[unit.name.toLowerCase()] = unit._id.toString();
    });
    const existingTaxes = await Taxes_1.TaxesModel.find({}).lean();
    const taxMap = {};
    existingTaxes.forEach((tax) => {
        taxMap[tax.name.toLowerCase()] = tax._id.toString();
    });
    // Check existing products
    const existingProducts = await products_1.ProductModel.find({}, { code: 1, name: 1 }).lean();
    const codeSet = new Set(existingProducts.map((p) => p.code).filter(Boolean));
    const nameSet = new Set(existingProducts.map((p) => p.name.toLowerCase()));
    for (const prod of products) {
        try {
            // Check if name already exists
            if (nameSet.has(prod.name.toLowerCase())) {
                results.skipped.push({
                    name: prod.name,
                    reason: "Product with this name already exists",
                });
                continue;
            }
            // Check if code already exists
            if (prod.code && codeSet.has(prod.code)) {
                results.skipped.push({
                    name: prod.name,
                    reason: `Code "${prod.code}" already exists`,
                });
                continue;
            }
            // Find categories
            let categoryIds = [];
            if (prod.category) {
                const categories = prod.category.split(",").map((c) => c.trim());
                for (const catName of categories) {
                    const catId = categoryMap[catName.toLowerCase()];
                    if (catId) {
                        categoryIds.push(catId);
                    }
                }
            }
            if (categoryIds.length === 0) {
                results.failed.push({
                    name: prod.name,
                    reason: `Category "${prod.category}" not found`,
                });
                continue;
            }
            // Find brand (optional)
            let brandId = null;
            if (prod.brand) {
                brandId = brandMap[prod.brand.toLowerCase()] || null;
            }
            // Find units (optional)
            const productUnitId = prod.product_unit ? unitMap[prod.product_unit.toLowerCase()] : null;
            const saleUnitId = prod.sale_unit ? unitMap[prod.sale_unit.toLowerCase()] : null;
            const purchaseUnitId = prod.purchase_unit ? unitMap[prod.purchase_unit.toLowerCase()] : null;
            // Find tax (optional)
            const taxId = prod.taxes ? taxMap[prod.taxes.toLowerCase()] : null;
            // Parse gallery images
            let galleryImages = [];
            if (prod.gallery_product) {
                galleryImages = prod.gallery_product.split(",").map((img) => img.trim()).filter(Boolean);
            }
            // Create product
            const newProduct = await products_1.ProductModel.create({
                name: prod.name,
                ar_name: prod.ar_name,
                ar_description: prod.ar_description || prod.ar_name,
                description: prod.description || "",
                categoryId: categoryIds,
                brandId: brandId || undefined,
                product_unit: productUnitId || undefined,
                sale_unit: saleUnitId || undefined,
                purchase_unit: purchaseUnitId || undefined,
                code: prod.code || undefined,
                price: prod.price,
                cost: prod.cost || undefined,
                quantity: prod.quantity,
                low_stock: prod.low_stock || 0,
                whole_price: prod.whole_price || undefined,
                start_quantaty: prod.start_quantaty || undefined,
                minimum_quantity_sale: prod.minimum_quantity_sale || 1,
                taxesId: taxId || undefined,
                exp_ability: prod.exp_ability,
                product_has_imei: prod.product_has_imei,
                different_price: prod.different_price,
                show_quantity: prod.show_quantity,
                maximum_to_show: prod.maximum_to_show || undefined,
                is_featured: prod.is_featured,
                image: prod.image || undefined,
                gallery_product: galleryImages.length > 0 ? galleryImages : undefined,
            });
            // Update category product count
            for (const catId of categoryIds) {
                await category_1.CategoryModel.findByIdAndUpdate(catId, {
                    $inc: { product_quantity: 1 },
                });
            }
            nameSet.add(prod.name.toLowerCase());
            if (prod.code)
                codeSet.add(prod.code);
            results.success.push(prod.name);
        }
        catch (error) {
            results.failed.push({
                name: prod.name,
                reason: error.message || "Unknown error",
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Import completed",
        total: products.length,
        success_count: results.success.length,
        failed_count: results.failed.length,
        skipped_count: results.skipped.length,
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
    });
};
exports.importProductsFromExcel = importProductsFromExcel;
const deletemanyproducts = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequest_1.BadRequest("At least one product ID is required");
    }
    await products_1.ProductModel.deleteMany({ _id: { $in: ids } });
    (0, response_1.SuccessResponse)(res, { message: "Products deleted successfully" });
};
exports.deletemanyproducts = deletemanyproducts;
const getLowStockProducts = async (req, res) => {
    const products = await products_1.ProductModel.find({
        $expr: { $lte: ["$quantity", "$low_stock"] }
    })
        .select("name ar_name code quantity low_stock image")
        .populate("categoryId", "name ar_name")
        .populate("brandId", "name ar_name");
    // تنسيق الـ response
    const formattedProducts = products.map(product => ({
        _id: product._id,
        name: product.name,
        ar_name: product.ar_name,
        code: product.code,
        image: product.image,
        actual_stock: product.quantity,
        minimum_stock: product.low_stock ?? 0,
        shortage: (product.low_stock ?? 0) - product.quantity, // الفرق
        category: product.categoryId,
        brand: product.brandId
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Low stock products retrieved successfully",
        count: formattedProducts.length,
        products: formattedProducts
    });
};
exports.getLowStockProducts = getLowStockProducts;
