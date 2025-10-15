"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductCode = exports.generateBarcodeImageController = exports.getProductByCode = exports.getOneProduct = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.createProduct = void 0;
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
const createProduct = async (req, res) => {
    const { name, image, categoryId, brandId, unit, price, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery_product, is_featured } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Product name is required");
    // تحقق من أن categoryId مصفوفة
    if (!Array.isArray(categoryId) || categoryId.length === 0) {
        throw new BadRequest_1.BadRequest("At least one categoryId is required");
    }
    // التحقق من وجود الكاتيجوريات
    const existitcategories = await category_1.CategoryModel.find({ _id: { $in: categoryId } });
    if (existitcategories.length !== categoryId.length) {
        throw new BadRequest_1.BadRequest("One or more categories not found");
    }
    // التحقق من وجود البراند
    const existitbrand = await brand_1.BrandModel.findById(brandId);
    if (!existitbrand)
        throw new BadRequest_1.BadRequest("Brand not found");
    // زيادة عدد المنتجات داخل كل كاتيجوري
    for (const cat of existitcategories) {
        cat.product_quantity += 1;
        await cat.save();
    }
    // 🖼️ حفظ الصورة الرئيسية
    let imageUrl;
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    // 🖼️ حفظ صور الجاليري
    let galleryUrls = [];
    if (gallery_product && Array.isArray(gallery_product)) {
        for (const g of gallery_product) {
            if (typeof g === "string") {
                const imgUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "products");
                galleryUrls.push(imgUrl);
            }
        }
    }
    // تحقق من العلاقات الشرطية
    if (exp_ability && !date_of_expiery) {
        throw new BadRequest_1.BadRequest("Expiry date is required when exp_ability is true");
    }
    if (show_quantity && !maximum_to_show) {
        throw new BadRequest_1.BadRequest("Maximum to show is required when show_quantity is true");
    }
    // إنشاء المنتج الأساسي
    const product = await products_1.ProductModel.create({
        name,
        image: imageUrl,
        categoryId,
        brandId,
        unit,
        price,
        quantity: 0,
        description,
        exp_ability,
        date_of_expiery,
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
        is_featured
    });
    // إنشاء الأسعار (ProductPrice)
    let totalQuantity = 0;
    if (Array.isArray(prices)) {
        for (const p of prices) {
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
                price: p.price,
                code: p.code,
                gallery: priceGalleryUrls,
                quantity: p.quantity || 0,
            });
            totalQuantity += p.quantity || 0;
            // إضافة الـ Options
            if (p.options && Array.isArray(p.options)) {
                for (const opt of p.options) {
                    await product_price_2.ProductPriceOptionModel.create({
                        product_price_id: productPrice._id,
                        option_id: opt,
                    });
                }
            }
        }
    }
    // تحديث كمية المنتج النهائية
    product.quantity = totalQuantity;
    await product.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Product created successfully",
        product,
    });
};
exports.createProduct = createProduct;
// ✅ READ (with populate)
const getProduct = async (req, res) => {
    // 1️⃣ جلب كل المنتجات مع العلاقات الأساسية
    const products = await products_1.ProductModel.find()
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    // 2️⃣ جلب الكاتيجوريز، البراندز، الفاريشنز
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    const variations = await Variation_1.VariationModel.find()
        .populate("options")
        .lean();
    // 3️⃣ تجهيز مصفوفة المنتجات بعد التنسيق الكامل
    const formattedProducts = [];
    for (const product of products) {
        // 🟦 جلب الأسعار الخاصة بكل منتج
        const prices = await product_price_1.ProductPriceModel.find({ productId: product._id }).lean();
        const formattedPrices = [];
        for (const price of prices) {
            // 🟩 جلب الـ options الخاصة بكل سعر
            const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: price._id })
                .populate("option_id")
                .lean();
            // 🟨 تجميع الخيارات حسب الـ variation
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
            // 🟧 تحويلها لمصفوفة منظمة
            const variationsArray = Object.keys(groupedOptions).map((varName) => ({
                name: varName,
                options: groupedOptions[varName],
            }));
            // 🟥 إضافة السعر بالهيكل الكامل
            formattedPrices.push({
                variations: variationsArray,
                _id: price._id,
                productId: price.productId,
                price: price.price,
                code: price.code,
                gallery: price.gallery,
                quantity: price.quantity,
                createdAt: price.createdAt,
                updatedAt: price.updatedAt,
                __v: price.__v,
            });
        }
        // ✅ دمج الأسعار بالمنتج
        product.prices = formattedPrices;
        formattedProducts.push(product);
    }
    // 4️⃣ إرسال الريسبونس النهائي
    (0, response_1.SuccessResponse)(res, {
        products: formattedProducts,
        categories,
        brands,
        variations,
    });
};
exports.getProduct = getProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, image, categoryId, brandId, unit, price, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery, is_featured } = req.body;
    const product = await products_1.ProductModel.findById(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // ✅ تحديث الصورة (يدعم base64 مع أو بدون prefix)
    if (image) {
        product.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    // ✅ تحديث الجاليري (يدعم base64 مع أو بدون prefix)
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
    // ✅ تحديث باقي الحقول
    product.name = name ?? product.name;
    product.categoryId = categoryId ?? product.categoryId;
    product.brandId = brandId ?? product.brandId;
    product.unit = unit ?? product.unit;
    product.price = price ?? product.price;
    product.description = description ?? product.description;
    product.exp_ability = exp_ability ?? product.exp_ability;
    product.date_of_expiery = date_of_expiery ?? product.date_of_expiery;
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
    // ✅ تحديث / إنشاء / حذف الأسعار والخيارات
    let totalQuantity = 0;
    if (prices && Array.isArray(prices)) {
        for (const p of prices) {
            let productPrice;
            if (p._id) {
                // تحديث سعر موجود
                productPrice = await product_price_1.ProductPriceModel.findByIdAndUpdate(p._id, { price: p.price, code: p.code, quantity: p.quantity || 0 }, { new: true });
            }
            else {
                // إنشاء سعر جديد
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
            // ✅ تحديث الخيارات
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
    // ✅ تحديث كمية المنتج النهائية
    product.quantity = totalQuantity;
    await product.save();
    (0, response_1.SuccessResponse)(res, { message: "Product updated successfully", product });
};
exports.updateProduct = updateProduct;
// ✅ DELETE
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
    // 1️⃣ جلب المنتج
    const product = await products_1.ProductModel.findById(id)
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // 2️⃣ جلب الكاتيجوريز و البراندز
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    // 3️⃣ جلب كل الـ variations مع options
    const variations = await Variation_1.VariationModel.find()
        .populate("options")
        .lean();
    // 4️⃣ جلب الأسعار الخاصة بالمنتج
    const prices = await product_price_1.ProductPriceModel.find({ productId: product._id }).lean();
    const formattedPrices = [];
    for (const price of prices) {
        // 🔹 جلب الخيارات المرتبطة بكل سعر
        const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: price._id })
            .populate("option_id")
            .lean();
        // 🔹 تجميع الخيارات حسب الـ variation
        const groupedOptions = {};
        options.forEach((po) => {
            const option = po.option_id;
            if (!option || !option._id)
                return; // ✅ حماية من null أو undefined
            const variation = variations.find((v) => v.options.some((opt) => opt._id.toString() === option._id.toString()));
            if (variation) {
                if (!groupedOptions[variation.name])
                    groupedOptions[variation.name] = [];
                groupedOptions[variation.name].push(option);
            }
        });
        // 🔹 تحويلها لمصفوفة بشكل منظم
        const variationsArray = Object.keys(groupedOptions).map((varName) => ({
            name: varName,
            options: groupedOptions[varName],
        }));
        // ✅ الترتيب: أولًا الـ variations، ثم باقي التفاصيل
        formattedPrices.push({
            variations: variationsArray,
            _id: price._id,
            productId: price.productId,
            price: price.price,
            code: price.code,
            gallery: price.gallery,
            quantity: price.quantity,
            createdAt: price.createdAt,
            updatedAt: price.updatedAt,
            __v: price.__v,
        });
    }
    product.prices = formattedPrices;
    (0, response_1.SuccessResponse)(res, {
        product,
        categories,
        brands,
        variations,
    });
};
exports.getOneProduct = getOneProduct;
const getProductByCode = async (req, res) => {
    const { code } = req.body;
    if (!code)
        throw new BadRequest_1.BadRequest("Code is required");
    // 1️⃣ ابحث عن السعر اللي بالكود ده
    const productPrice = await product_price_1.ProductPriceModel.findOne({ code }).lean();
    if (!productPrice)
        throw new NotFound_1.NotFound("No product found for this code");
    // 2️⃣ ابحث عن المنتج المرتبط بالسعر ده
    const product = await products_1.ProductModel.findById(productPrice.productId)
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // 3️⃣ جيب كل الـ variations مع options
    const variations = await Variation_1.VariationModel.find()
        .populate("options")
        .lean();
    // 4️⃣ جيب الكاتيجوريز و البراندز
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    // 5️⃣ جيب الخيارات المرتبطة بالسعر ده
    const options = await product_price_2.ProductPriceOptionModel.find({ product_price_id: productPrice._id })
        .populate("option_id")
        .lean();
    // 6️⃣ جمّع الخيارات حسب الـ variation
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
    // 7️⃣ أضف السعر داخل المنتج
    product.price = {
        ...productPrice,
        variations: variationsArray,
    };
    // 8️⃣ رجّع كل البيانات
    (0, response_1.SuccessResponse)(res, {
        product,
        categories,
        brands,
        variations,
    });
};
exports.getProductByCode = getProductByCode;
const generateBarcodeImageController = async (req, res) => {
    const { product_price_id } = req.params; // 👈 غيرنا الاسم ليكون واضح أكثر
    if (!product_price_id)
        throw new BadRequest_1.BadRequest("Product price ID is required");
    const productPrice = await product_price_1.ProductPriceModel.findById(product_price_id);
    if (!productPrice)
        throw new NotFound_1.NotFound("Product price not found");
    // 🟢 ناخد الكود الخاص بالسعر
    const productCode = productPrice.code;
    if (!productCode)
        throw new BadRequest_1.BadRequest("Product price does not have a code yet");
    // 🟢 نولّد صورة الباركود
    const imageLink = await (0, barcode_1.generateBarcodeImage)(productCode, productCode);
    // 🟢 نكوّن لينك كامل يوصل للعميل
    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;
    (0, response_1.SuccessResponse)(res, {
        image: fullImageUrl,
        code: productCode,
    });
};
exports.generateBarcodeImageController = generateBarcodeImageController;
const generateProductCode = async (req, res) => {
    let newCode = (0, barcode_1.generateEAN13Barcode)();
    // التأكد من عدم التكرار
    while (await product_price_1.ProductPriceModel.findOne({ code: newCode })) {
        newCode = (0, barcode_1.generateEAN13Barcode)();
    }
    (0, response_1.SuccessResponse)(res, { code: newCode });
};
exports.generateProductCode = generateProductCode;
