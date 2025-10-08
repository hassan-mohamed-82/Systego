"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductCode = exports.generateBarcodeImageController = exports.getOneProduct = exports.deleteProduct = exports.updateProduct = exports.getProduct = exports.createProduct = void 0;
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
    const { name, image, categoryId, brandId, unit, price, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, gallery } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Product name is required");
    // ✅ تحقق من أن categoryId مصفوفة
    if (!Array.isArray(categoryId) || categoryId.length === 0) {
        throw new BadRequest_1.BadRequest("At least one categoryId is required");
    }
    // ✅ التحقق من وجود الكاتيجوريات
    const existitcategories = await category_1.CategoryModel.find({ _id: { $in: categoryId } });
    if (existitcategories.length !== categoryId.length) {
        throw new BadRequest_1.BadRequest("One or more categories not found");
    }
    // ✅ التحقق من وجود البراند
    const existitbrand = await brand_1.BrandModel.findById(brandId);
    if (!existitbrand)
        throw new BadRequest_1.BadRequest("Brand not found");
    // ✅ زيادة عدد المنتجات داخل كل كاتيجوري
    for (const cat of existitcategories) {
        cat.product_quantity += 1;
        await cat.save();
    }
    // 🖼️ حفظ الصورة الرئيسية
    let imageUrl = image;
    if (image && image.startsWith("data:")) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    // 🖼️ حفظ صور الجاليري
    let galleryUrls = [];
    if (gallery && Array.isArray(gallery)) {
        for (const g of gallery) {
            if (g.startsWith("data:")) {
                const imgUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "products");
                galleryUrls.push(imgUrl);
            }
            else {
                galleryUrls.push(g);
            }
        }
    }
    // ✅ تحقق من العلاقات الشرطية
    if (exp_ability && !date_of_expiery) {
        throw new BadRequest_1.BadRequest("Expiry date is required when exp_ability is true");
    }
    if (show_quantity && !maximum_to_show) {
        throw new BadRequest_1.BadRequest("Maximum to show is required when show_quantity is true");
    }
    // ✅ إنشاء المنتج الأساسي
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
        gallery: galleryUrls,
    });
    // ✅ إنشاء الأسعار (ProductPrice)
    let totalQuantity = 0;
    if (Array.isArray(prices)) {
        for (const p of prices) {
            // 🖼️ حفظ صور الجاليري الخاصة بالسعر
            let priceGalleryUrls = [];
            if (p.gallery && Array.isArray(p.gallery)) {
                for (const g of p.gallery) {
                    if (g.startsWith("data:")) {
                        const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                        priceGalleryUrls.push(gUrl);
                    }
                    else {
                        priceGalleryUrls.push(g);
                    }
                }
            }
            // إنشاء سجل السعر
            const productPrice = await product_price_1.ProductPriceModel.create({
                productId: product._id,
                price: p.price,
                code: p.code,
                gallery: priceGalleryUrls,
                quantity: p.quantity || 0,
            });
            totalQuantity += p.quantity || 0;
            // ✅ إضافة الـ Options
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
    // ✅ تحديث كمية المنتج النهائية
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
    const products = await products_1.ProductModel.find()
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    const variations = await Variation_1.VariationModel.find()
        .populate("options") // جاي من الـ virtual
        .lean();
    (0, response_1.SuccessResponse)(res, { products, categories, brands, variations });
};
exports.getProduct = getProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, image, categoryId, brandId, unit, price, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, // Array of prices with optional _id and options
    gallery } = req.body;
    const product = await products_1.ProductModel.findById(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // ✅ تحديث الصورة
    if (image && image.startsWith("data:")) {
        product.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    else if (image) {
        product.image = image;
    }
    if (gallery && Array.isArray(gallery)) {
        let galleryUrles = [];
        for (const g of gallery) {
            if (g.startsWith("data:")) {
                const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                galleryUrles.push(gUrl);
            }
            else {
                galleryUrles.push(g);
            }
        }
        product.gallery = galleryUrles;
    }
    // ✅ تحديث باقي الحقول (من غير quantity)
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
    await product.save();
    // ✅ تحديث/اضافة/حذف الأسعار والخيارات
    let totalQuantity = 0;
    if (prices && Array.isArray(prices)) {
        for (const p of prices) {
            let productPrice;
            if (p._id) {
                // update
                productPrice = await product_price_1.ProductPriceModel.findByIdAndUpdate(p._id, { price: p.price, code: p.code, quantity: p.quantity || 0 }, { new: true });
            }
            else {
                // create جديد
                let galleryUrls = [];
                if (p.gallery && Array.isArray(p.gallery)) {
                    for (const g of p.gallery) {
                        if (g.startsWith("data:")) {
                            const gUrl = await (0, handleImages_1.saveBase64Image)(g, Date.now().toString(), req, "product_gallery");
                            galleryUrls.push(gUrl);
                        }
                        else {
                            galleryUrls.push(g);
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
            // ✅ تحديث الـ options
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
    // ✅ تحديث الكمية النهائية
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
    const product = await products_1.ProductModel.findById(id)
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    const categories = await category_1.CategoryModel.find().lean();
    const brands = await brand_1.BrandModel.find().lean();
    const variations = await Variation_1.VariationModel.find()
        .populate("options") // جاي من الـ virtual
        .lean();
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const prices = await product_price_1.ProductPriceModel.find({ productId: product._id }).lean();
    for (const price of prices) {
        const options = await product_price_2.ProductPriceOptionModel.find({
            product_price_id: price._id,
        })
            .populate("option_id")
            .lean();
        price.options = options.map((o) => o.option_id);
    }
    product.prices = prices;
    (0, response_1.SuccessResponse)(res, { product, categories, brands, variations });
};
exports.getOneProduct = getOneProduct;
const generateBarcodeImageController = async (req, res) => {
    const { product_id } = req.params;
    if (!product_id)
        throw new BadRequest_1.BadRequest("Product ID is required");
    // find the product price (not product itself)
    const productPrice = await product_price_1.ProductPriceModel.findById(product_id);
    if (!productPrice)
        throw new NotFound_1.NotFound("Product price not found");
    // get code from product price
    const productCode = productPrice.code;
    if (!productCode)
        throw new BadRequest_1.BadRequest("Product price does not have a code yet");
    // generate barcode image file
    const imageLink = await (0, barcode_1.generateBarcodeImage)(productCode, productCode);
    // build full url for client access
    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;
    (0, response_1.SuccessResponse)(res, { image: fullImageUrl });
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
