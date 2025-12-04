"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnePurchase = exports.updatePurchase = exports.getPurchase = exports.createPurchase = void 0;
const Purchase_1 = require("../../models/schema/admin/Purchase");
const purchase_item_1 = require("../../models/schema/admin/purchase_item");
const purchase_due_payment_1 = require("../../models/schema/admin/purchase_due_payment");
const purchase_item_option_1 = require("../../models/schema/admin/purchase_item_option");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const PurchaseInvoice_1 = require("../../models/schema/admin/PurchaseInvoice");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const suppliers_1 = require("../../models/schema/admin/suppliers");
const Currency_1 = require("../../models/schema/admin/Currency");
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
    const { date, warehouse_id, supplier_id, receipt_img, currency_id, payment_status, exchange_rate, subtotal, shiping_cost, discount, tax_id, purchase_items = [], purchase_materials = [], // ✅ جديد
    financials, purchase_due_payment, } = req.body;
    // ========== Validations ==========
    const existingWarehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!existingWarehouse)
        throw new BadRequest_1.BadRequest("Warehouse not found");
    const existingSupplier = await suppliers_1.SupplierModel.findById(supplier_id);
    if (!existingSupplier)
        throw new BadRequest_1.BadRequest("Supplier not found");
    const existingCurrency = await Currency_1.CurrencyModel.findById(currency_id);
    if (!existingCurrency)
        throw new BadRequest_1.BadRequest("Currency not found");
    const existingTax = await Taxes_1.TaxesModel.findById(tax_id);
    if (!existingTax)
        throw new BadRequest_1.BadRequest("Tax not found");
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
        currency_id,
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
        const existingPurchaseItem = await purchase_item_1.PurchaseItemModel.findOne({ warehouse_id, product_id });
        if (!existingPurchaseItem && warehouse) {
            warehouse.number_of_products += 1;
            await warehouse.save();
        }
        const purchaseItem = await purchase_item_1.PurchaseItemModel.create({
            date: p.date,
            warehouse_id: warehouse_id,
            purchase_id: purchase._id,
            category_id: category_id,
            product_id: product_id,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
            discount: p.discount,
            tax: p.tax,
            subtotal: p.subtotal,
            item_type: "product",
        });
        // Update product quantity
        const product = await products_1.ProductModel.findById(product_id);
        if (product) {
            product.quantity += p.quantity ?? 0;
            await product.save();
            const category = await category_1.CategoryModel.findById(product.categoryId);
            if (category) {
                category.product_quantity += p.quantity ?? 0;
                await category.save();
            }
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
                    option_id: opt.id,
                });
            }
        }
    }
    // ========== Process Materials ========== ✅ جديد
    for (const m of purchase_materials) {
        const material = await Materials_1.MaterialModel.findById(m.material_id);
        if (!material)
            throw new NotFound_1.NotFound(`Material not found: ${m.material_id}`);
        // Create purchase item
        await purchase_item_1.PurchaseItemModel.create({
            date: m.date || date,
            warehouse_id: warehouse_id,
            purchase_id: purchase._id,
            category_id: material.category_id,
            material_id: m.material_id,
            quantity: m.quantity,
            unit_cost: m.unit_cost,
            discount: m.discount || 0,
            tax: m.tax || 0,
            subtotal: m.subtotal,
            item_type: "material",
        });
        // Update material quantity only
        material.quantity += m.quantity ?? 0;
        await material.save();
        // Update warehouse
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
                financial.initial_balance -= ele.payment_amount;
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
const getPurchase = async (req, res) => {
    const [purchases, warehouses, currencies, suppliers, taxes, financial_account, products, materials, variations,] = await Promise.all([
        Purchase_1.PurchaseModel.find()
            .select("_id date shiping_cost discount")
            .populate({ path: "warehouse_id", select: "_id name" })
            .populate({ path: "supplier_id", select: "_id username phone_number" })
            .populate({ path: "currency_id", select: "_id name" })
            .populate({ path: "tax_id", select: "_id name" })
            .lean(),
        Warehouse_1.WarehouseModel.find().select("_id name").lean(),
        Currency_1.CurrencyModel.find().select("_id name").lean(),
        suppliers_1.SupplierModel.find().select("_id username").lean(),
        Taxes_1.TaxesModel.find({ status: true }).select("_id name").lean(),
        Financial_Account_1.BankAccountModel.find().select("_id name").lean(),
        products_1.ProductModel.find().select("_id name").lean(),
        Materials_1.MaterialModel.find().select("_id name ar_name unit quantity").lean(), // ✅ جديد
        Variation_1.VariationModel.find({ status: true })
            .select("_id name")
            .populate({ path: "options", select: "_id name", match: { status: true } })
            .lean(),
    ]);
    (0, response_1.SuccessResponse)(res, {
        purchases,
        warehouses,
        currencies,
        suppliers,
        taxes,
        financial_account,
        products,
        materials,
        variations,
    });
};
exports.getPurchase = getPurchase;
const updatePurchase = async (req, res) => {
    const { id } = req.params;
    const { date, warehouse_id, supplier_id, receipt_img, shiping_cost, discount, tax_id, exchange_rate, purchase_items, purchase_materials, } = req.body;
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
    purchase.date = date ?? purchase.date;
    purchase.warehouse_id = warehouse_id ?? purchase.warehouse_id;
    purchase.supplier_id = supplier_id ?? purchase.supplier_id;
    purchase.exchange_rate = exchange_rate ?? purchase.exchange_rate;
    purchase.shiping_cost = shiping_cost ?? purchase.shiping_cost;
    purchase.discount = discount ?? purchase.discount;
    purchase.tax_id = tax_id ?? purchase.tax_id;
    await purchase.save();
    // ========== Update Products ==========
    if (purchase_items && Array.isArray(purchase_items)) {
        for (const p of purchase_items) {
            if (p._id) {
                const purchaseItem = await purchase_item_1.PurchaseItemModel.findById(p._id);
                if (purchaseItem && purchaseItem.item_type === "product") {
                    const product = (await products_1.ProductModel.findById(purchaseItem.product_id));
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
                    }
                    purchaseItem.date = p.date ?? purchaseItem.date;
                    purchaseItem.quantity = p.quantity ?? purchaseItem.quantity;
                    purchaseItem.unit_cost = p.unit_cost ?? purchaseItem.unit_cost;
                    purchaseItem.tax = p.tax ?? purchaseItem.tax;
                    purchaseItem.subtotal = p.subtotal ?? purchaseItem.subtotal;
                    await purchaseItem.save();
                }
            }
        }
    }
    // ========== Update Materials ========== ✅ جديد
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
                    }
                    purchaseItem.date = m.date ?? purchaseItem.date;
                    purchaseItem.quantity = m.quantity ?? purchaseItem.quantity;
                    purchaseItem.unit_cost = m.unit_cost ?? purchaseItem.unit_cost;
                    purchaseItem.tax = m.tax ?? purchaseItem.tax;
                    purchaseItem.subtotal = m.subtotal ?? purchaseItem.subtotal;
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
                    quantity: m.quantity,
                    unit_cost: m.unit_cost,
                    discount: m.discount || 0,
                    tax: m.tax || 0,
                    subtotal: m.subtotal,
                    item_type: "material",
                });
                material.quantity += m.quantity ?? 0;
                await material.save();
            }
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Purchase updated successfully", purchase });
};
exports.updatePurchase = updatePurchase;
const getOnePurchase = async (req, res) => {
    const { id } = req.params;
    const baseUrl = req.protocol + "://" + req.get("host");
    const purchase = await Purchase_1.PurchaseModel.findById(id) // 
        .select('_id date shiping_cost discount payment_status exchange_rate subtotal receipt_img')
        .populate({ path: "warehouse_id", select: "_id name" })
        .populate({ path: "supplier_id", select: "_id username phone_number" })
        .populate({ path: "currency_id", select: "_id name" })
        .populate({ path: "tax_id", select: "_id name" })
        .populate({ path: "items", populate: "options" }) // جاي من الـ virtual
        .populate({ path: "invoices", select: "_id amount date", populate: { path: "financial_id", select: "_id name" } }) // جاي من الـ virtual
        .populate({ path: "duePayments", select: "_id amount date" }) // جاي من الـ virtual 
        .lean({ virtuals: true });
    if (!purchase)
        throw new NotFound_1.NotFound("Purchase not found");
    if (purchase?.receipt_img) {
        purchase.receipt_img = `${baseUrl}/${purchase.receipt_img}`;
    }
    (0, response_1.SuccessResponse)(res, { purchase });
};
exports.getOnePurchase = getOnePurchase;
