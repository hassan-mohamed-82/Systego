"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpiredProducts = exports.getExpiringProducts = exports.getCriticalExpiryProducts = exports.getLowStockProducts = exports.updatePurchase = exports.getPurchaseById = exports.getAllPurchases = exports.createPurchase = void 0;
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
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const product_price_1 = require("../../models/schema/admin/product_price");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const handleImages_1 = require("../../utils/handleImages");
const Materials_1 = require("../../models/schema/admin/Materials");
const createPurchase = async (req, res) => {
    const { date, warehouse_id, supplier_id, receipt_img, payment_status, exchange_rate, total, discount, shipping_cost, grand_total, tax_id, purchase_items = [], purchase_materials = [], financials = [], purchase_due_payment = [], note, } = req.body;
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
    // ========== Payment Validation ==========
    const totalPaidNow = financials.reduce((sum, f) => sum + (f.payment_amount || 0), 0);
    const totalDuePayments = purchase_due_payment.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPayments = totalPaidNow + totalDuePayments;
    // التحقق من حالة الدفع
    if (payment_status === "full") {
        // لازم يدفع كل المبلغ دلوقتي
        if (totalPaidNow !== grand_total) {
            throw new BadRequest_1.BadRequest(`Full payment required. Expected: ${grand_total}, Received: ${totalPaidNow}`);
        }
        if (purchase_due_payment.length > 0) {
            throw new BadRequest_1.BadRequest("Full payment should not have due payments");
        }
    }
    else if (payment_status === "later") {
        // مفيش دفع دلوقتي، كله لاحقاً
        if (totalPaidNow > 0) {
            throw new BadRequest_1.BadRequest("Later payment should not have immediate payments");
        }
        if (totalDuePayments !== grand_total) {
            throw new BadRequest_1.BadRequest(`Due payments must equal grand_total. Expected: ${grand_total}, Received: ${totalDuePayments}`);
        }
    }
    else if (payment_status === "partial") {
        // دفع جزء دلوقتي + الباقي لاحقاً
        if (totalPaidNow <= 0) {
            throw new BadRequest_1.BadRequest("Partial payment requires immediate payment");
        }
        if (totalPaidNow >= grand_total) {
            throw new BadRequest_1.BadRequest("Partial payment should be less than grand_total. Use 'full' status instead");
        }
        if (totalPayments !== grand_total) {
            throw new BadRequest_1.BadRequest(`Total payments must equal grand_total. Expected: ${grand_total}, Received: ${totalPayments}`);
        }
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
        total,
        discount,
        shipping_cost,
        grand_total,
        tax_id,
        note,
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
        // حساب الكمية
        let totalQuantity = p.quantity ?? 0;
        const hasVariations = p.variations && Array.isArray(p.variations) && p.variations.length > 0;
        if (hasVariations) {
            totalQuantity = p.variations.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
        }
        const existingPurchaseItem = await purchase_item_1.PurchaseItemModel.findOne({ warehouse_id, product_id });
        if (!existingPurchaseItem && warehouse) {
            warehouse.number_of_products += 1;
            await warehouse.save();
        }
        const purchaseItem = await purchase_item_1.PurchaseItemModel.create({
            date: p.date || date,
            warehouse_id,
            purchase_id: purchase._id,
            category_id,
            product_id,
            patch_number: p.patch_number,
            quantity: totalQuantity,
            unit_cost: p.unit_cost,
            subtotal: p.subtotal,
            discount_share: p.discount_share || 0,
            unit_cost_after_discount: p.unit_cost_after_discount || p.unit_cost,
            tax: p.tax || 0,
            item_type: "product",
            date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
        });
        // لو في Variations
        if (hasVariations) {
            for (const v of p.variations) {
                // التحقق من وجود product_price_id
                if (!v.product_price_id) {
                    throw new BadRequest_1.BadRequest("product_price_id is required for variations");
                }
                const productPrice = await product_price_1.ProductPriceModel.findById(v.product_price_id);
                if (!productPrice) {
                    throw new NotFound_1.NotFound(`ProductPrice not found: ${v.product_price_id}`);
                }
                // تحديث كمية الـ ProductPrice
                await product_price_1.ProductPriceModel.findByIdAndUpdate(v.product_price_id, {
                    $inc: { quantity: v.quantity ?? 0 },
                });
                // إنشاء PurchaseItemOption
                await purchase_item_option_1.PurchaseItemOptionModel.create({
                    purchase_item_id: purchaseItem._id,
                    product_price_id: v.product_price_id,
                    option_id: v.option_id,
                    quantity: v.quantity || 0,
                });
            }
        }
        // تحديث كمية الـ Product الرئيسي
        await products_1.ProductModel.findByIdAndUpdate(product._id, {
            $inc: { quantity: totalQuantity },
        });
        // Update category
        const category = await category_1.CategoryModel.findById(product.categoryId);
        if (category) {
            category.product_quantity += totalQuantity;
            await category.save();
        }
        // Update warehouse
        if (warehouse) {
            warehouse.stock_Quantity += totalQuantity;
            await warehouse.save();
        }
        // Update product-warehouse
        let productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
            productId: product_id,
            warehouseId: warehouse_id,
        });
        if (productWarehouse) {
            productWarehouse.quantity += totalQuantity;
            await productWarehouse.save();
        }
        else {
            await Product_Warehouse_1.Product_WarehouseModel.create({
                productId: product_id,
                warehouseId: warehouse_id,
                quantity: totalQuantity,
            });
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
            subtotal: m.subtotal,
            discount_share: m.discount_share || 0,
            unit_cost_after_discount: m.unit_cost_after_discount || m.unit_cost,
            tax: m.tax || 0,
            item_type: "material",
        });
        material.quantity += m.quantity ?? 0;
        await material.save();
        if (warehouse) {
            warehouse.stock_Quantity += m.quantity ?? 0;
            await warehouse.save();
        }
    }
    // ========== Create Invoices (الدفع الفوري) ==========
    if (financials && Array.isArray(financials) && financials.length > 0) {
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
    // ========== Create Due Payments (الدفع اللاحق) ==========
    if (purchase_due_payment && Array.isArray(purchase_due_payment) && purchase_due_payment.length > 0) {
        for (const due_payment of purchase_due_payment) {
            await purchase_due_payment_1.PurchaseDuePaymentModel.create({
                purchase_id: purchase._id,
                amount: due_payment.amount,
                date: due_payment.date,
            });
        }
    }
    // ========== Get Full Purchase ==========
    const fullPurchase = await Purchase_1.PurchaseModel.findById(purchase._id)
        .populate({
        path: "items",
        populate: [
            { path: "product_id" },
            { path: "material_id" },
            { path: "category_id" },
            {
                path: "options",
                populate: [
                    { path: "product_price_id" },
                    { path: "option_id" },
                ],
            },
        ],
    })
        .populate("warehouse_id")
        .populate("supplier_id")
        .populate("tax_id")
        .populate("invoices")
        .populate("duePayments");
    (0, response_1.SuccessResponse)(res, { message: "Purchase created successfully", purchase: fullPurchase });
};
exports.createPurchase = createPurchase;
const getAllPurchases = async (req, res) => {
    const { page = 1, limit = 10, warehouse_id, supplier_id } = req.query;
    const filter = {};
    if (warehouse_id)
        filter.warehouse_id = warehouse_id;
    if (supplier_id)
        filter.supplier_id = supplier_id;
    // جلب كل الـ Purchases
    const allPurchases = await Purchase_1.PurchaseModel.find(filter)
        .populate("warehouse_id")
        .populate("supplier_id")
        .populate("tax_id")
        .populate({
        path: "items",
        populate: [
            { path: "product_id" },
            { path: "material_id" },
            { path: "category_id" },
            {
                path: "options",
                populate: [
                    { path: "product_price_id" },
                    { path: "option_id" },
                ],
            },
        ],
    })
        .populate("invoices")
        .populate("duePayments")
        .sort({ createdAt: -1 });
    // تقسيم حسب الـ payment_status
    const fullPayments = allPurchases.filter((p) => p.payment_status === "full");
    const laterPayments = allPurchases.filter((p) => p.payment_status === "later");
    const partialPayments = allPurchases.filter((p) => p.payment_status === "partial");
    // حساب الإحصائيات
    const stats = {
        total_purchases: allPurchases.length,
        full_count: fullPayments.length,
        later_count: laterPayments.length,
        partial_count: partialPayments.length,
        total_amount: allPurchases.reduce((sum, p) => sum + (p.grand_total || 0), 0),
        full_amount: fullPayments.reduce((sum, p) => sum + (p.grand_total || 0), 0),
        later_amount: laterPayments.reduce((sum, p) => sum + (p.grand_total || 0), 0),
        partial_amount: partialPayments.reduce((sum, p) => sum + (p.grand_total || 0), 0),
    };
    (0, response_1.SuccessResponse)(res, {
        stats,
        purchases: {
            full: fullPayments,
            later: laterPayments,
            partial: partialPayments,
        },
    });
};
exports.getAllPurchases = getAllPurchases;
const getPurchaseById = async (req, res) => {
    const { id } = req.params;
    const purchase = await Purchase_1.PurchaseModel.findById(id)
        .populate("warehouse_id")
        .populate("supplier_id")
        .populate("tax_id")
        .populate({
        path: "items",
        populate: [
            { path: "product_id" },
            { path: "material_id" },
            { path: "category_id" },
            { path: "options", populate: { path: "option_id" } },
        ],
    })
        .populate("invoices")
        .populate("duePayments");
    if (!purchase)
        throw new NotFound_1.NotFound("Purchase not found");
    (0, response_1.SuccessResponse)(res, { purchase });
};
exports.getPurchaseById = getPurchaseById;
const updatePurchase = async (req, res) => {
    const { id } = req.params;
    const { date, warehouse_id, supplier_id, receipt_img, payment_status, exchange_rate, total, discount, shipping_cost, grand_total, tax_id, note, purchase_items = [], purchase_materials = [], financials = [], purchase_due_payment = [], } = req.body;
    const existingPurchase = await Purchase_1.PurchaseModel.findById(id);
    if (!existingPurchase)
        throw new NotFound_1.NotFound("Purchase not found");
    // ========== Validations ==========
    if (warehouse_id) {
        const existingWarehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
        if (!existingWarehouse)
            throw new BadRequest_1.BadRequest("Warehouse not found");
    }
    if (supplier_id) {
        const existingSupplier = await suppliers_1.SupplierModel.findById(supplier_id);
        if (!existingSupplier)
            throw new BadRequest_1.BadRequest("Supplier not found");
    }
    if (tax_id) {
        const existingTax = await Taxes_1.TaxesModel.findById(tax_id);
        if (!existingTax)
            throw new BadRequest_1.BadRequest("Tax not found");
    }
    // ========== Payment Validation ==========
    const finalGrandTotal = grand_total ?? existingPurchase.grand_total;
    const finalPaymentStatus = payment_status ?? existingPurchase.payment_status;
    const totalPaidNow = financials.reduce((sum, f) => sum + (f.payment_amount || 0), 0);
    const totalDuePayments = purchase_due_payment.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPayments = totalPaidNow + totalDuePayments;
    if (finalPaymentStatus === "full") {
        if (totalPaidNow !== finalGrandTotal) {
            throw new BadRequest_1.BadRequest(`Full payment required. Expected: ${finalGrandTotal}, Received: ${totalPaidNow}`);
        }
        if (purchase_due_payment.length > 0) {
            throw new BadRequest_1.BadRequest("Full payment should not have due payments");
        }
    }
    else if (finalPaymentStatus === "later") {
        if (totalPaidNow > 0) {
            throw new BadRequest_1.BadRequest("Later payment should not have immediate payments");
        }
        if (totalDuePayments !== finalGrandTotal) {
            throw new BadRequest_1.BadRequest(`Due payments must equal grand_total. Expected: ${finalGrandTotal}, Received: ${totalDuePayments}`);
        }
    }
    else if (finalPaymentStatus === "partial") {
        if (totalPaidNow <= 0) {
            throw new BadRequest_1.BadRequest("Partial payment requires immediate payment");
        }
        if (totalPaidNow >= finalGrandTotal) {
            throw new BadRequest_1.BadRequest("Partial payment should be less than grand_total. Use 'full' status instead");
        }
        if (totalPayments !== finalGrandTotal) {
            throw new BadRequest_1.BadRequest(`Total payments must equal grand_total. Expected: ${finalGrandTotal}, Received: ${totalPayments}`);
        }
    }
    // ========== Save Image ==========
    let imageUrl = receipt_img;
    if (receipt_img && receipt_img.startsWith("data:")) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(receipt_img, Date.now().toString(), req, "Purchases");
    }
    // ========== Reverse Old Items ==========
    const oldItems = await purchase_item_1.PurchaseItemModel.find({ purchase_id: id });
    for (const item of oldItems) {
        const itemData = item;
        if (itemData.item_type === "product" && itemData.product_id) {
            await products_1.ProductModel.findByIdAndUpdate(itemData.product_id, {
                $inc: { quantity: -itemData.quantity },
            });
            const category = await category_1.CategoryModel.findById(itemData.category_id);
            if (category) {
                category.product_quantity -= itemData.quantity;
                await category.save();
            }
            const productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                productId: itemData.product_id,
                warehouseId: itemData.warehouse_id,
            });
            if (productWarehouse) {
                productWarehouse.quantity -= itemData.quantity;
                await productWarehouse.save();
            }
            // ✅ Reverse ProductPrice quantity if variations exist
            const oldOptions = await purchase_item_option_1.PurchaseItemOptionModel.find({ purchase_item_id: itemData._id });
            for (const opt of oldOptions) {
                if (opt.product_price_id) {
                    await product_price_1.ProductPriceModel.findByIdAndUpdate(opt.product_price_id, {
                        $inc: { quantity: -opt.quantity },
                    });
                }
            }
        }
        if (itemData.item_type === "material" && itemData.material_id) {
            const material = await Materials_1.MaterialModel.findById(itemData.material_id);
            if (material) {
                material.quantity -= itemData.quantity;
                await material.save();
            }
        }
        await purchase_item_option_1.PurchaseItemOptionModel.deleteMany({ purchase_item_id: itemData._id });
    }
    // Update warehouse stock
    const oldWarehouse = await Warehouse_1.WarehouseModel.findById(existingPurchase.warehouse_id);
    if (oldWarehouse) {
        const totalOldQty = oldItems.reduce((sum, item) => sum + item.quantity, 0);
        oldWarehouse.stock_Quantity -= totalOldQty;
        await oldWarehouse.save();
    }
    // Delete old items
    await purchase_item_1.PurchaseItemModel.deleteMany({ purchase_id: id });
    // Delete old invoices and restore balance
    const oldInvoices = await PurchaseInvoice_1.PurchaseInvoiceModel.find({ purchase_id: id });
    for (const inv of oldInvoices) {
        const financial = await Financial_Account_1.BankAccountModel.findById(inv.financial_id);
        if (financial) {
            financial.balance += inv.amount;
            await financial.save();
        }
    }
    await PurchaseInvoice_1.PurchaseInvoiceModel.deleteMany({ purchase_id: id });
    // Delete old due payments
    await purchase_due_payment_1.PurchaseDuePaymentModel.deleteMany({ purchase_id: id });
    // ========== Update Purchase ==========
    existingPurchase.date = date ?? existingPurchase.date;
    existingPurchase.warehouse_id = warehouse_id ?? existingPurchase.warehouse_id;
    existingPurchase.supplier_id = supplier_id ?? existingPurchase.supplier_id;
    existingPurchase.receipt_img = imageUrl ?? existingPurchase.receipt_img;
    existingPurchase.payment_status = finalPaymentStatus;
    existingPurchase.exchange_rate = exchange_rate ?? existingPurchase.exchange_rate;
    existingPurchase.total = total ?? existingPurchase.total;
    existingPurchase.discount = discount ?? existingPurchase.discount;
    existingPurchase.shipping_cost = shipping_cost ?? existingPurchase.shipping_cost;
    existingPurchase.grand_total = finalGrandTotal;
    if (tax_id !== undefined)
        existingPurchase.tax_id = tax_id;
    if (note !== undefined)
        existingPurchase.note = note;
    await existingPurchase.save();
    let warehouse = await Warehouse_1.WarehouseModel.findById(existingPurchase.warehouse_id);
    // ========== Process New Products ==========
    for (const p of purchase_items) {
        let category_id = p.category_id;
        let product_id = p.product_id;
        if (p.product_code) {
            const product_price = await product_price_1.ProductPriceModel.findOne({ code: p.product_code }).populate("productId");
            if (product_price) {
                const productDoc = product_price.productId;
                product_id = productDoc?._id;
                category_id = productDoc?.categoryId;
            }
        }
        const product = await products_1.ProductModel.findById(product_id);
        if (!product)
            throw new NotFound_1.NotFound(`Product not found: ${product_id}`);
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
        // حساب الكمية
        let totalQuantity = p.quantity ?? 0;
        const hasVariations = p.variations && Array.isArray(p.variations) && p.variations.length > 0;
        if (hasVariations) {
            totalQuantity = p.variations.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
        }
        const purchaseItem = await purchase_item_1.PurchaseItemModel.create({
            date: p.date || existingPurchase.date,
            warehouse_id: existingPurchase.warehouse_id,
            purchase_id: existingPurchase._id,
            category_id,
            product_id,
            patch_number: p.patch_number,
            quantity: totalQuantity,
            unit_cost: p.unit_cost,
            subtotal: p.subtotal,
            discount_share: p.discount_share || 0,
            unit_cost_after_discount: p.unit_cost_after_discount || p.unit_cost,
            tax: p.tax || 0,
            item_type: "product",
            date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
        });
        // لو في Variations
        if (hasVariations) {
            for (const v of p.variations) {
                if (!v.product_price_id) {
                    throw new BadRequest_1.BadRequest("product_price_id is required for variations");
                }
                const productPrice = await product_price_1.ProductPriceModel.findById(v.product_price_id);
                if (!productPrice) {
                    throw new NotFound_1.NotFound(`ProductPrice not found: ${v.product_price_id}`);
                }
                await product_price_1.ProductPriceModel.findByIdAndUpdate(v.product_price_id, {
                    $inc: { quantity: v.quantity ?? 0 },
                });
                await purchase_item_option_1.PurchaseItemOptionModel.create({
                    purchase_item_id: purchaseItem._id,
                    product_price_id: v.product_price_id,
                    option_id: v.option_id,
                    quantity: v.quantity || 0,
                });
            }
        }
        await products_1.ProductModel.findByIdAndUpdate(product._id, {
            $inc: { quantity: totalQuantity },
        });
        const category = await category_1.CategoryModel.findById(product.categoryId);
        if (category) {
            category.product_quantity += totalQuantity;
            await category.save();
        }
        if (warehouse) {
            warehouse.stock_Quantity += totalQuantity;
            await warehouse.save();
        }
        let productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
            productId: product_id,
            warehouseId: existingPurchase.warehouse_id,
        });
        if (productWarehouse) {
            productWarehouse.quantity += totalQuantity;
            await productWarehouse.save();
        }
        else {
            await Product_Warehouse_1.Product_WarehouseModel.create({
                productId: product_id,
                warehouseId: existingPurchase.warehouse_id,
                quantity: totalQuantity,
            });
        }
    }
    // ========== Process New Materials ==========
    for (const m of purchase_materials) {
        const material = await Materials_1.MaterialModel.findById(m.material_id);
        if (!material)
            throw new NotFound_1.NotFound(`Material not found: ${m.material_id}`);
        await purchase_item_1.PurchaseItemModel.create({
            date: m.date || existingPurchase.date,
            warehouse_id: existingPurchase.warehouse_id,
            purchase_id: existingPurchase._id,
            category_id: material.category_id,
            material_id: m.material_id,
            patch_number: m.patch_number,
            quantity: m.quantity,
            unit_cost: m.unit_cost,
            subtotal: m.subtotal,
            discount_share: m.discount_share || 0,
            unit_cost_after_discount: m.unit_cost_after_discount || m.unit_cost,
            tax: m.tax || 0,
            item_type: "material",
        });
        material.quantity += m.quantity ?? 0;
        await material.save();
        if (warehouse) {
            warehouse.stock_Quantity += m.quantity ?? 0;
            await warehouse.save();
        }
    }
    // ========== Create New Invoices ==========
    if (financials && Array.isArray(financials) && financials.length > 0) {
        for (const ele of financials) {
            await PurchaseInvoice_1.PurchaseInvoiceModel.create({
                financial_id: ele.financial_id,
                amount: ele.payment_amount,
                purchase_id: existingPurchase._id,
            });
            const financial = await Financial_Account_1.BankAccountModel.findById(ele.financial_id);
            if (financial) {
                financial.balance -= ele.payment_amount;
                await financial.save();
            }
        }
    }
    // ========== Create New Due Payments ==========
    if (purchase_due_payment && Array.isArray(purchase_due_payment) && purchase_due_payment.length > 0) {
        for (const due_payment of purchase_due_payment) {
            await purchase_due_payment_1.PurchaseDuePaymentModel.create({
                purchase_id: existingPurchase._id,
                amount: due_payment.amount,
                date: due_payment.date,
            });
        }
    }
    const fullPurchase = await Purchase_1.PurchaseModel.findById(existingPurchase._id)
        .populate({
        path: "items",
        populate: [
            { path: "product_id" },
            { path: "material_id" },
            { path: "category_id" },
            {
                path: "options",
                populate: [
                    { path: "product_price_id" },
                    { path: "option_id" },
                ],
            },
        ],
    })
        .populate("warehouse_id")
        .populate("supplier_id")
        .populate("tax_id")
        .populate("invoices")
        .populate("duePayments");
    (0, response_1.SuccessResponse)(res, { message: "Purchase updated successfully", purchase: fullPurchase });
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
        shortage: (product.low_stock ?? 0) - (product.quantity ?? 0), // الفرق
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
