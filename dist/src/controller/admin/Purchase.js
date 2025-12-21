"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpiredProducts = exports.getExpiringProducts = exports.getCriticalExpiryProducts = exports.getLowStockProducts = exports.updatePurchase = exports.getPurchaseById = exports.getPurchases = exports.createPurchase = void 0;
const Purchase_1 = require("../../models/schema/admin/Purchase");
const purchase_item_1 = require("../../models/schema/admin/purchase_item");
const purchase_due_payment_1 = require("../../models/schema/admin/purchase_due_payment");
const purchase_item_option_1 = require("../../models/schema/admin/purchase_item_option");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const PurchaseInvoice_1 = require("../../models/schema/admin/PurchaseInvoice");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const suppliers_1 = require("../../models/schema/admin/suppliers");
const Taxes_1 = require("../../models/schema/admin/Taxes");
const category_1 = require("../../models/schema/admin/category");
const products_1 = require("../../models/schema/admin/products");
const Variation_1 = require("../../models/schema/admin/Variation");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const product_price_1 = require("../../models/schema/admin/product_price");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const handleImages_1 = require("../../utils/handleImages");
const Materials_1 = require("../../models/schema/admin/Materials");
const createPurchase = async (req, res) => {
    const { date, warehouse_id, supplier_id, receipt_img, payment_status, exchange_rate, subtotal, shiping_cost, discount, tax_id, purchase_items = [], purchase_materials = [], financials, purchase_due_payment, } = req.body;
    // ========== Validations ==========
    const existingWarehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!existingWarehouse)
        throw new BadRequest_1.BadRequest("Warehouse not found");
    const existingSupplier = await suppliers_1.SupplierModel.findById(supplier_id);
    if (!existingSupplier)
        throw new BadRequest_1.BadRequest("Supplier not found");
    if (tax_id) {
        const existingTax = await Taxes_1.TaxesModel.findById(tax_id);
        if (!existingTax)
            throw new BadRequest_1.BadRequest("Tax not found");
    }
    // ========== Save Image ==========
    let imageUrl = receipt_img;
    if (receipt_img && receipt_img.startsWith("data:")) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(receipt_img, Date.now().toString(), req, "Purchases");
    }
    // ========== Create Purchase ==========
    const purchase = await Purchase_1.PurchaseModel.create({
        date,
        warehouse_id,
        supplier_id,
        receipt_img: imageUrl,
        payment_status,
        exchange_rate,
        subtotal,
        shiping_cost,
        discount,
        tax_id,
    });
    let warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    // ========== Process Products ==========
    for (const p of purchase_items) {
        let product_code = p.product_code;
        let category_id = p.category_id;
        let product_id = p.product_id;
        if (product_code) {
            const product_price = await product_price_1.ProductPriceModel.findOne({ code: product_code }).populate("productId");
            if (product_price) {
                const productDoc = product_price.productId;
                product_id = productDoc?._id;
                category_id = productDoc?.categoryId;
            }
        }
        const product = await products_1.ProductModel.findById(product_id);
        if (!product)
            throw new NotFound_1.NotFound(`Product not found: ${product_id}`);
        // التحقق من تاريخ الانتهاء
        if (product.exp_ability) {
            if (!p.date_of_expiery) {
                throw new BadRequest_1.BadRequest(`Expiry date is required for product: ${product.name}`);
            }
            const expiryDate = new Date(p.date_of_expiery);
            const today = new Date();
            expiryDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            if (expiryDate < today) {
                throw new BadRequest_1.BadRequest(`Expiry date cannot be in the past for product: ${product.name}`);
            }
        }
        const existingPurchaseItem = await purchase_item_1.PurchaseItemModel.findOne({ warehouse_id, product_id });
        if (!existingPurchaseItem && warehouse) {
            warehouse.number_of_products += 1;
            await warehouse.save();
        }
        const purchaseItem = await purchase_item_1.PurchaseItemModel.create({
            date: p.date,
            warehouse_id,
            purchase_id: purchase._id,
            category_id,
            product_id,
            patch_number: p.patch_number,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
            discount: p.discount,
            tax: p.tax,
            subtotal: p.subtotal,
            item_type: "product",
            date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
        });
        // Update product quantity
        product.quantity += p.quantity ?? 0;
        await product.save();
        // Update category
        const category = await category_1.CategoryModel.findById(product.categoryId);
        if (category) {
            category.product_quantity += p.quantity ?? 0;
            await category.save();
        }
        // Update warehouse
        if (warehouse) {
            warehouse.stock_Quantity += p.quantity ?? 0;
            await warehouse.save();
        }
        // Update product-warehouse
        let productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
            productId: product_id,
            WarehouseId: warehouse_id,
        });
        if (productWarehouse) {
            productWarehouse.quantity += p.quantity ?? 0;
            await productWarehouse.save();
        }
        else {
            await Product_Warehouse_1.Product_WarehouseModel.create({
                productId: product_id,
                WarehouseId: warehouse_id,
                quantity: p.quantity ?? 0,
            });
        }
        // Create options
        if (p.options && Array.isArray(p.options)) {
            for (const opt of p.options) {
                await purchase_item_option_1.PurchaseItemOptionModel.create({
                    purchase_item_id: purchaseItem._id,
                    option_id: opt.id || opt.option_id,
                });
            }
        }
    }
    // ========== Process Materials ==========
    for (const m of purchase_materials) {
        const material = await Materials_1.MaterialModel.findById(m.material_id);
        if (!material)
            throw new NotFound_1.NotFound(`Material not found: ${m.material_id}`);
        await purchase_item_1.PurchaseItemModel.create({
            date: m.date || date,
            warehouse_id,
            purchase_id: purchase._id,
            category_id: material.category_id,
            material_id: m.material_id,
            patch_number: m.patch_number,
            quantity: m.quantity,
            unit_cost: m.unit_cost,
            discount: m.discount || 0,
            tax: m.tax || 0,
            subtotal: m.subtotal,
            item_type: "material",
        });
        material.quantity += m.quantity ?? 0;
        await material.save();
        if (warehouse) {
            warehouse.stock_Quantity += m.quantity ?? 0;
            await warehouse.save();
        }
    }
    // ========== Create Invoices ==========
    if (financials && Array.isArray(financials)) {
        for (const ele of financials) {
            await PurchaseInvoice_1.PurchaseInvoiceModel.create({
                financial_id: ele.financial_id,
                amount: ele.payment_amount,
                purchase_id: purchase._id,
            });
            const financial = await Financial_Account_1.BankAccountModel.findById(ele.financial_id);
            if (financial) {
                financial.balance -= ele.payment_amount;
                await financial.save();
            }
        }
    }
    // ========== Create Due Payments ==========
    if (purchase_due_payment && Array.isArray(purchase_due_payment)) {
        for (const due_payment of purchase_due_payment) {
            await purchase_due_payment_1.PurchaseDuePaymentModel.create({
                purchase_id: purchase._id,
                amount: due_payment.amount,
                date: due_payment.date,
            });
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Purchase created successfully", purchase });
};
exports.createPurchase = createPurchase;
const getPurchases = async (req, res) => {
    const [purchases, warehouses, suppliers, taxes, financial_account, products, materials, variations,] = await Promise.all([
        Purchase_1.PurchaseModel.find()
            .select("_id date shiping_cost discount payment_status subtotal")
            .populate({ path: "warehouse_id", select: "_id name" })
            .populate({ path: "supplier_id", select: "_id username phone_number" })
            .populate({ path: "tax_id", select: "_id name rate" })
            .lean(),
        Warehouse_1.WarehouseModel.find({ status: true }).select("_id name").lean(),
        suppliers_1.SupplierModel.find({ status: true }).select("_id username").lean(),
        Taxes_1.TaxesModel.find({ status: true }).select("_id name rate").lean(),
        Financial_Account_1.BankAccountModel.find({ status: true }).select("_id name balance").lean(),
        products_1.ProductModel.find().select("_id name ar_name exp_ability code price").lean(),
        Materials_1.MaterialModel.find().select("_id name ar_name unit quantity").lean(),
        Variation_1.VariationModel.find({ status: true })
            .select("_id name")
            .populate({ path: "options", select: "_id name", match: { status: true } })
            .lean(),
    ]);
    (0, response_1.SuccessResponse)(res, {
        purchases,
        warehouses,
        suppliers,
        taxes,
        financial_account,
        products,
        materials,
        variations,
    });
};
exports.getPurchases = getPurchases;
const getPurchaseById = async (req, res) => {
    const { id } = req.params;
    const baseUrl = req.protocol + "://" + req.get("host");
    const purchase = await Purchase_1.PurchaseModel.findById(id)
        .populate({ path: "warehouse_id", select: "_id name" })
        .populate({ path: "supplier_id", select: "_id username phone_number" })
        .populate({ path: "tax_id", select: "_id name rate" })
        .lean({ virtuals: true });
    if (!purchase)
        throw new NotFound_1.NotFound("Purchase not found");
    // Get items with populated data
    const items = await purchase_item_1.PurchaseItemModel.find({ purchase_id: id })
        .populate({ path: "product_id", select: "_id name ar_name code price" })
        .populate({ path: "material_id", select: "_id name ar_name" })
        .populate({ path: "category_id", select: "_id name" })
        .lean({ virtuals: true });
    // Separate products and materials
    const products = items.filter(item => item.item_type === "product");
    const materials = items.filter(item => item.item_type === "material");
    // Get options for each product item
    for (const product of products) {
        const options = await purchase_item_option_1.PurchaseItemOptionModel.find({ purchase_item_id: product._id })
            .populate({ path: "option_id", select: "_id name" })
            .lean();
        product.options = options;
    }
    // Get invoices
    const invoices = await PurchaseInvoice_1.PurchaseInvoiceModel.find({ purchase_id: id })
        .populate({ path: "financial_id", select: "_id name" })
        .lean();
    // Get due payments
    const duePayments = await purchase_due_payment_1.PurchaseDuePaymentModel.find({ purchase_id: id }).lean();
    // Fix image URL
    if (purchase?.receipt_img) {
        purchase.receipt_img = `${baseUrl}/${purchase.receipt_img}`;
    }
    (0, response_1.SuccessResponse)(res, {
        purchase: {
            ...purchase,
            products,
            materials,
            invoices,
            duePayments,
        },
    });
};
exports.getPurchaseById = getPurchaseById;
const updatePurchase = async (req, res) => {
    const { id } = req.params;
    const { date, warehouse_id, supplier_id, receipt_img, shiping_cost, discount, tax_id, exchange_rate, payment_status, subtotal, purchase_items, purchase_materials, } = req.body;
    const purchase = await Purchase_1.PurchaseModel.findById(id);
    if (!purchase)
        throw new NotFound_1.NotFound("Purchase not found");
    // Update image
    if (receipt_img && receipt_img.startsWith("data:")) {
        purchase.receipt_img = await (0, handleImages_1.saveBase64Image)(receipt_img, Date.now().toString(), req, "Purchases");
    }
    else if (receipt_img) {
        purchase.receipt_img = receipt_img;
    }
    // Update fields
    if (date !== undefined)
        purchase.date = date;
    if (warehouse_id !== undefined)
        purchase.warehouse_id = warehouse_id;
    if (supplier_id !== undefined)
        purchase.supplier_id = supplier_id;
    if (exchange_rate !== undefined)
        purchase.exchange_rate = exchange_rate;
    if (shiping_cost !== undefined)
        purchase.shiping_cost = shiping_cost;
    if (discount !== undefined)
        purchase.discount = discount;
    if (tax_id !== undefined)
        purchase.tax_id = tax_id;
    if (payment_status !== undefined)
        purchase.payment_status = payment_status;
    if (subtotal !== undefined)
        purchase.subtotal = subtotal;
    await purchase.save();
    // ========== Update Products ==========
    if (purchase_items && Array.isArray(purchase_items)) {
        for (const p of purchase_items) {
            if (p._id) {
                // Update existing item
                const purchaseItem = await purchase_item_1.PurchaseItemModel.findById(p._id);
                if (purchaseItem && purchaseItem.item_type === "product") {
                    const product = await products_1.ProductModel.findById(purchaseItem.product_id);
                    if (product?.exp_ability && p.date_of_expiery) {
                        const expiryDate = new Date(p.date_of_expiery);
                        const today = new Date();
                        expiryDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        if (expiryDate < today) {
                            throw new BadRequest_1.BadRequest(`Expiry date cannot be in the past for product: ${product.name}`);
                        }
                    }
                    if (product && p.quantity !== undefined) {
                        const diff = p.quantity - purchaseItem.quantity;
                        product.quantity += diff;
                        await product.save();
                        const category = await category_1.CategoryModel.findById(product.categoryId);
                        if (category) {
                            category.product_quantity += diff;
                            await category.save();
                        }
                        const productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                            productId: purchaseItem.product_id,
                            WarehouseId: purchase.warehouse_id,
                        });
                        if (productWarehouse) {
                            productWarehouse.quantity += diff;
                            await productWarehouse.save();
                        }
                        const warehouse = await Warehouse_1.WarehouseModel.findById(purchase.warehouse_id);
                        if (warehouse) {
                            warehouse.stock_Quantity += diff;
                            await warehouse.save();
                        }
                    }
                    if (p.date !== undefined)
                        purchaseItem.date = p.date;
                    if (p.quantity !== undefined)
                        purchaseItem.quantity = p.quantity;
                    if (p.unit_cost !== undefined)
                        purchaseItem.unit_cost = p.unit_cost;
                    if (p.tax !== undefined)
                        purchaseItem.tax = p.tax;
                    if (p.discount !== undefined)
                        purchaseItem.discount = p.discount;
                    if (p.subtotal !== undefined)
                        purchaseItem.subtotal = p.subtotal;
                    if (p.date_of_expiery !== undefined)
                        purchaseItem.date_of_expiery = p.date_of_expiery;
                    if (p.patch_number !== undefined)
                        purchaseItem.patch_number = p.patch_number;
                    await purchaseItem.save();
                }
            }
            else {
                // Create new item
                const product = await products_1.ProductModel.findById(p.product_id);
                if (!product)
                    throw new NotFound_1.NotFound(`Product not found: ${p.product_id}`);
                if (product.exp_ability && !p.date_of_expiery) {
                    throw new BadRequest_1.BadRequest(`Expiry date is required for product: ${product.name}`);
                }
                const newItem = await purchase_item_1.PurchaseItemModel.create({
                    date: p.date || date,
                    warehouse_id: purchase.warehouse_id,
                    purchase_id: purchase._id,
                    category_id: product.categoryId,
                    product_id: p.product_id,
                    patch_number: p.patch_number,
                    quantity: p.quantity,
                    unit_cost: p.unit_cost,
                    discount: p.discount || 0,
                    tax: p.tax || 0,
                    subtotal: p.subtotal,
                    item_type: "product",
                    date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
                });
                product.quantity += p.quantity ?? 0;
                await product.save();
                const warehouse = await Warehouse_1.WarehouseModel.findById(purchase.warehouse_id);
                if (warehouse) {
                    warehouse.stock_Quantity += p.quantity ?? 0;
                    await warehouse.save();
                }
                // Create options
                if (p.options && Array.isArray(p.options)) {
                    for (const opt of p.options) {
                        await purchase_item_option_1.PurchaseItemOptionModel.create({
                            purchase_item_id: newItem._id,
                            option_id: opt.id || opt.option_id,
                        });
                    }
                }
            }
        }
    }
    // ========== Update Materials ==========
    if (purchase_materials && Array.isArray(purchase_materials)) {
        for (const m of purchase_materials) {
            if (m._id) {
                // Update existing
                const purchaseItem = await purchase_item_1.PurchaseItemModel.findById(m._id);
                if (purchaseItem && purchaseItem.item_type === "material") {
                    const material = await Materials_1.MaterialModel.findById(purchaseItem.material_id);
                    if (material && m.quantity !== undefined) {
                        const diff = m.quantity - purchaseItem.quantity;
                        material.quantity += diff;
                        await material.save();
                        const warehouse = await Warehouse_1.WarehouseModel.findById(purchase.warehouse_id);
                        if (warehouse) {
                            warehouse.stock_Quantity += diff;
                            await warehouse.save();
                        }
                    }
                    if (m.date !== undefined)
                        purchaseItem.date = m.date;
                    if (m.quantity !== undefined)
                        purchaseItem.quantity = m.quantity;
                    if (m.unit_cost !== undefined)
                        purchaseItem.unit_cost = m.unit_cost;
                    if (m.tax !== undefined)
                        purchaseItem.tax = m.tax;
                    if (m.discount !== undefined)
                        purchaseItem.discount = m.discount;
                    if (m.subtotal !== undefined)
                        purchaseItem.subtotal = m.subtotal;
                    await purchaseItem.save();
                }
            }
            else {
                // Create new
                const material = await Materials_1.MaterialModel.findById(m.material_id);
                if (!material)
                    throw new NotFound_1.NotFound(`Material not found: ${m.material_id}`);
                await purchase_item_1.PurchaseItemModel.create({
                    date: m.date || date,
                    warehouse_id: purchase.warehouse_id,
                    purchase_id: purchase._id,
                    category_id: material.category_id,
                    material_id: m.material_id,
                    patch_number: m.patch_number,
                    quantity: m.quantity,
                    unit_cost: m.unit_cost,
                    discount: m.discount || 0,
                    tax: m.tax || 0,
                    subtotal: m.subtotal,
                    item_type: "material",
                });
                material.quantity += m.quantity ?? 0;
                await material.save();
                const warehouse = await Warehouse_1.WarehouseModel.findById(purchase.warehouse_id);
                if (warehouse) {
                    warehouse.stock_Quantity += m.quantity ?? 0;
                    await warehouse.save();
                }
            }
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Purchase updated successfully", purchase });
};
exports.updatePurchase = updatePurchase;
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
// المنتجات اللي هتنتهي قريباً (خلال أسبوع)
const getCriticalExpiryProducts = async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    const criticalItems = await purchase_item_1.PurchaseItemModel.find({
        item_type: "product",
        date_of_expiery: {
            $exists: true,
            $ne: null,
            $gte: today,
            $lte: nextWeek
        },
        quantity: { $gt: 0 }
    })
        .populate({
        path: "product_id",
        select: "name ar_name code image"
    })
        .populate({
        path: "warehouse_id",
        select: "name"
    })
        .select("product_id warehouse_id quantity date_of_expiery patch_number")
        .sort({ date_of_expiery: 1 });
    const formattedProducts = criticalItems.map(item => {
        const expiryDate = new Date(item.date_of_expiery);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            _id: item._id,
            product: item.product_id,
            warehouse: item.warehouse_id,
            quantity: item.quantity,
            patch_number: item.patch_number,
            expiry_date: item.date_of_expiery,
            days_remaining: diffDays
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Critical expiry products retrieved successfully",
        count: formattedProducts.length,
        products: formattedProducts
    });
};
exports.getCriticalExpiryProducts = getCriticalExpiryProducts;
const getExpiringProducts = async (req, res) => {
    const { days = 30 } = req.query; // افتراضياً هيجيب اللي هتنتهي خلال 30 يوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));
    futureDate.setHours(23, 59, 59, 999);
    // جيب الـ PurchaseItems اللي عندها تاريخ انتهاء
    const expiringItems = await purchase_item_1.PurchaseItemModel.find({
        item_type: "product",
        date_of_expiery: { $exists: true, $ne: null, $lte: futureDate }
    })
        .populate({
        path: "product_id",
        select: "name ar_name code image exp_ability"
    })
        .populate({
        path: "warehouse_id",
        select: "name"
    })
        .select("product_id warehouse_id quantity date_of_expiery patch_number")
        .sort({ date_of_expiery: 1 }); // الأقرب للانتهاء أولاً
    // تنسيق الـ response
    const formattedProducts = expiringItems.map(item => {
        const expiryDate = new Date(item.date_of_expiery);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let status;
        if (diffDays < 0) {
            status = "expired";
        }
        else if (diffDays === 0) {
            status = "expires_today";
        }
        else if (diffDays <= 7) {
            status = "critical";
        }
        else if (diffDays <= 30) {
            status = "warning";
        }
        else {
            status = "normal";
        }
        return {
            _id: item._id,
            product: item.product_id,
            warehouse: item.warehouse_id,
            quantity: item.quantity,
            patch_number: item.patch_number,
            expiry_date: item.date_of_expiery,
            days_remaining: diffDays,
            status
        };
    });
    // إحصائيات
    const stats = {
        total: formattedProducts.length,
        expired: formattedProducts.filter(p => p.status === "expired").length,
        expires_today: formattedProducts.filter(p => p.status === "expires_today").length,
        critical: formattedProducts.filter(p => p.status === "critical").length,
        warning: formattedProducts.filter(p => p.status === "warning").length
    };
    (0, response_1.SuccessResponse)(res, {
        message: "Expiring products retrieved successfully",
        stats,
        products: formattedProducts
    });
};
exports.getExpiringProducts = getExpiringProducts;
// المنتجات المنتهية الصلاحية فقط
const getExpiredProducts = async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiredItems = await purchase_item_1.PurchaseItemModel.find({
        item_type: "product",
        date_of_expiery: { $exists: true, $ne: null, $lt: today },
        quantity: { $gt: 0 } // اللي لسه فيها كمية
    })
        .populate({
        path: "product_id",
        select: "name ar_name code image"
    })
        .populate({
        path: "warehouse_id",
        select: "name"
    })
        .select("product_id warehouse_id quantity date_of_expiery patch_number")
        .sort({ date_of_expiery: 1 });
    const formattedProducts = expiredItems.map(item => {
        const expiryDate = new Date(item.date_of_expiery);
        const diffTime = today.getTime() - expiryDate.getTime();
        const expiredDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            _id: item._id,
            product: item.product_id,
            warehouse: item.warehouse_id,
            quantity: item.quantity,
            patch_number: item.patch_number,
            expiry_date: item.date_of_expiery,
            expired_since_days: expiredDays
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Expired products retrieved successfully",
        count: formattedProducts.length,
        products: formattedProducts
    });
};
exports.getExpiredProducts = getExpiredProducts;
