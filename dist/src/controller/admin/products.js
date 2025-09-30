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
const createProduct = async (req, res) => {
    const { name, image, categoryId, brandId, unit, price, quantity, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, // array of { price, code, gallery, options: [option_id] }
     } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Product name is required");
    const existitcategory = await category_1.CategoryModel.findById(categoryId);
    if (!existitcategory)
        throw new BadRequest_1.BadRequest("Category not found");
    const existitbrand = await brand_1.BrandModel.findById(brandId);
    if (!existitbrand)
        throw new BadRequest_1.BadRequest("Brand not found");
    existitcategory.product_quantity += 1;
    // 🖼️ حفظ الصورة الأساسية لو Base64
    let imageUrl = image;
    if (image && image.startsWith("data:")) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    // 1️⃣ إنشاء المنتج الأساسي
    const product = await products_1.ProductModel.create({
        name,
        image: imageUrl,
        categoryId,
        brandId,
        unit,
        price,
        quantity,
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
    });
    // 2️⃣ إنشاء الأسعار (ProductPrice) + الصور + الـ options
    if (prices && Array.isArray(prices)) {
        for (const p of prices) {
            // ✅ حفظ صور الـ gallery (base64)
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
            const productPrice = await product_price_1.ProductPriceModel.create({
                productId: product._id,
                price: p.price,
                code: p.code,
                gallery: galleryUrls,
                quantity: p.quantity || 0,
            });
            // 3️⃣ إضافة الـ Options في pivot (ProductPriceOption)
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
    await existitcategory.save();
    (0, response_1.SuccessResponse)(res, { message: "Product created successfully", product });
};
exports.createProduct = createProduct;
// ✅ READ (with populate)
const getProduct = async (req, res) => {
    const products = await products_1.ProductModel.find()
        .populate("categoryId")
        .populate("brandId")
        .populate("taxesId")
        .lean();
    // ✅ نجيب الأسعار + options لكل منتج
    for (const product of products) {
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
    }
    (0, response_1.SuccessResponse)(res, products);
};
exports.getProduct = getProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, image, categoryId, brandId, unit, price, quantity, description, exp_ability, date_of_expiery, minimum_quantity_sale, low_stock, whole_price, start_quantaty, taxesId, product_has_imei, different_price, show_quantity, maximum_to_show, prices, // Array of prices with optional _id and options
     } = req.body;
    const product = await products_1.ProductModel.findById(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // ✅ تحديث الصورة لو Base64
    if (image && image.startsWith("data:")) {
        product.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "products");
    }
    else if (image) {
        product.image = image;
    }
    // ✅ تحديث باقي الحقول
    product.name = name ?? product.name;
    product.categoryId = categoryId ?? product.categoryId;
    product.brandId = brandId ?? product.brandId;
    product.unit = unit ?? product.unit;
    product.price = price ?? product.price;
    product.quantity = quantity ?? product.quantity;
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
    if (prices && Array.isArray(prices)) {
        for (const p of prices) {
            let productPrice;
            // لو فيه _id → update
            if (p._id) {
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
            // ✅ تحديث الـ options
            if (productPrice && p.options && Array.isArray(p.options)) {
                // نمسح القديم
                await product_price_2.ProductPriceOptionModel.deleteMany({ product_price_id: productPrice._id });
                // نضيف الجديد
                for (const opt of p.options) {
                    await product_price_2.ProductPriceOptionModel.create({
                        product_price_id: productPrice._id,
                        option_id: opt,
                    });
                }
            }
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Product updated successfully", product });
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    // 1️⃣ حذف المنتج
    const product = await products_1.ProductModel.findByIdAndDelete(id);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    // 2️⃣ جلب كل الأسعار المرتبطة بالمنتج
    const prices = await product_price_1.ProductPriceModel.find({ productId: id });
    const priceIds = prices.map((p) => p._id);
    // 3️⃣ حذف كل الـ options المرتبطة بالأسعار
    await product_price_2.ProductPriceOptionModel.deleteMany({ product_price_id: { $in: priceIds } });
    // 4️⃣ حذف كل الأسعار نفسها
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
    // ✅ نجيب الأسعار + options
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
    (0, response_1.SuccessResponse)(res, product);
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
