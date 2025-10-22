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
const createPurchase = async (req, res) => {
    const { date, warehouse_id, supplier_id, receipt_img, currency_id, payment_status, exchange_rate, subtotal, shiping_cost, discount, tax_id, purchase_items, financials, purchase_due_payment, } = req.body;
    // ✅ التحقق من الوجود
    const existitWarehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!existitWarehouse)
        throw new BadRequest_1.BadRequest("Warehouse not found");
    const existitSupplier = await suppliers_1.SupplierModel.findById(supplier_id);
    if (!existitSupplier)
        throw new BadRequest_1.BadRequest("Supplier not found");
    const existitCurrency = await Currency_1.CurrencyModel.findById(currency_id);
    if (!existitCurrency)
        throw new BadRequest_1.BadRequest("Currency not found");
    const existitTax = await Taxes_1.TaxesModel.findById(tax_id);
    if (!existitTax)
        throw new BadRequest_1.BadRequest("Tax not found");
    // 🖼️ حفظ الصورة
    let imageUrl = receipt_img;
    if (receipt_img && receipt_img.startsWith("data:")) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(receipt_img, Date.now().toString(), req, "Purchases");
    }
    // 1️⃣ إنشاء الـ Purchase
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
    let ware_house = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    // 2️⃣ إنشاء الـ Purchase Items
    let totalQuantity = 0;
    if (purchase_items && Array.isArray(purchase_items)) {
        for (const p of purchase_items) {
            let product_code = p.product_code;
            let category_id = p.category_id;
            let product_id = p.product_id;
            if (product_code) {
                const product_price = await product_price_1.ProductPriceModel.findOne({ code: product_code }).populate("productId");
                if (product_price) {
                    const productDoc = product_price.productId; // 👈 حل الخطأ هنا
                    product_id = productDoc?._id;
                    category_id = productDoc?.categoryId;
                }
            }
            const purchase_product_item = await purchase_item_1.PurchaseItemModel
                .find({ warehouse_id, product_id });
            if (!purchase_product_item) {
                if (ware_house) {
                    ware_house.number_of_products += 1;
                    await ware_house.save();
                }
            }
            const PurchaseItems = await purchase_item_1.PurchaseItemModel.create({
                date: p.date,
                purchase_id: purchase._id,
                category_id: category_id,
                product_id: product_id,
                quantity: p.quantity,
                unit_cost: p.unit_cost,
                discount: p.discount,
                tax: p.tax,
                subtotal: p.subtotal,
            });
            // ✅ تحديث كمية المنتج
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
            if (ware_house) {
                ware_house.stock_Quantity += p.quantity ?? 0;
                await ware_house.save();
            }
            // ✅ تحديث كمية المنتج في المستودع
            let product_warehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                productId: product_id,
                WarehouseId: purchase.warehouse_id,
            });
            if (product_warehouse) {
                product_warehouse.quantity += p.quantity ?? 0;
                await product_warehouse.save();
            }
            else {
                await Product_Warehouse_1.Product_WarehouseModel.create({
                    productId: product_id,
                    WarehouseId: purchase.warehouse_id,
                    quantity: p.quantity ?? 0,
                });
            }
            // جمع الكمية الكلية
            totalQuantity += p.quantity || 0;
            // ✅ إنشاء الـ Options لو موجودة
            if (p.options && Array.isArray(p.options)) {
                for (const opt of p.options) {
                    await purchase_item_option_1.PurchaseItemOptionModel.create({
                        purchase_item_id: PurchaseItems._id,
                        option_id: opt.id,
                    });
                }
            }
        }
    }
    // 3️⃣ إنشاء الـ Invoices (Financials)
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
    // 4️⃣ إنشاء الـ Due Payments
    if (purchase_due_payment && Array.isArray(purchase_due_payment)) {
        for (const due_payment of purchase_due_payment) {
            await purchase_due_payment_1.PurchaseDuePaymentModel.create({
                purchase_id: purchase._id,
                amount: due_payment.amount,
                date: due_payment.date,
            });
        }
    }
    // ✅ الاستجابة النهائية
    (0, response_1.SuccessResponse)(res, { message: "Purchase created successfully", purchase });
};
exports.createPurchase = createPurchase;
const getPurchase = async (req, res) => {
    const [purchases, warehouses, currencies, suppliers, taxes, financial_account, products, variations] = await Promise.all([
        Purchase_1.PurchaseModel.find()
            .select('_id date shiping_cost discount')
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
        Variation_1.VariationModel.find({ status: true })
            .select('_id name')
            .populate({
            path: "options",
            select: "_id name",
            match: { status: true }
        })
            .lean()
    ]);
    (0, response_1.SuccessResponse)(res, {
        purchases,
        warehouses,
        currencies,
        suppliers,
        taxes,
        financial_account,
        products,
        variations
    });
};
exports.getPurchase = getPurchase;
const updatePurchase = async (req, res) => {
    const { id } = req.params;
    const { date, warehouse_id, supplier_id, receipt_img, shiping_cost, discount, tax_id, exchange_rate, purchase_items, } = req.body;
    const purchase = await Purchase_1.PurchaseModel.findById(id);
    if (!purchase)
        throw new NotFound_1.NotFound("Purchase not found");
    // ✅ تحديث الصورة
    if (receipt_img && receipt_img.startsWith("data:")) {
        purchase.receipt_img = await (0, handleImages_1.saveBase64Image)(receipt_img, Date.now().toString(), req, "Purchases");
    }
    else if (receipt_img) {
        purchase.receipt_img = receipt_img;
    }
    // ✅ تحديث باقي الحقول (من غير quantity)
    purchase.date = date ?? purchase.date;
    purchase.warehouse_id = warehouse_id ?? purchase.warehouse_id;
    purchase.supplier_id = supplier_id ?? purchase.supplier_id;
    purchase.exchange_rate = exchange_rate ?? purchase.exchange_rate;
    purchase.shiping_cost = shiping_cost ?? purchase.shiping_cost;
    purchase.discount = discount ?? purchase.discount;
    purchase.tax_id = tax_id ?? purchase.tax_id;
    await purchase.save();
    // ✅ تحديث العناصر
    if (purchase_items && Array.isArray(purchase_items)) {
        for (const p of purchase_items) {
            if (p._id) {
                // ----------------- update -----------------
                const purchase_item = await purchase_item_1.PurchaseItemModel.findById(p._id);
                if (purchase_item) {
                    // ✅ تعديل كمية المنتج في المخزون
                    const product = await products_1.ProductModel.findById(purchase_item.product_id);
                    if (product && p.quantity) {
                        // تعديل الكمية في المنتج
                        product.quantity =
                            product.quantity - purchase_item.quantity + p.quantity;
                        await product.save();
                        // تعديل الكمية في التصنيف
                        const category = await category_1.CategoryModel.findById(product.categoryId);
                        if (category) {
                            category.product_quantity =
                                category.product_quantity - purchase_item.quantity + p.quantity;
                            await category.save();
                        }
                        // تعديل الكمية في المنتج داخل المخزن
                        let product_warehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                            productId: purchase_item.product_id,
                            WarehouseId: purchase.warehouse_id,
                        });
                        if (product_warehouse) {
                            product_warehouse.quantity =
                                product_warehouse.quantity - purchase_item.quantity + p.quantity;
                            await product_warehouse.save();
                        }
                        else {
                            await Product_Warehouse_1.Product_WarehouseModel.create({
                                productId: purchase_item.product_id,
                                WarehouseId: purchase.warehouse_id,
                                quantity: p.quantity,
                            });
                        }
                    }
                    // ✅ تحديث بيانات العنصر نفسه
                    let product_code = p.product_code;
                    let category_id = p.category_id;
                    let product_id = p.product_id;
                    if (product_code) {
                        const product_price = await product_price_1.ProductPriceModel.findOne({
                            code: product_code,
                        }).populate("productId");
                        if (product_price) {
                            product_id = product_price.productId._id;
                            category_id = product_price.productId.categoryId;
                        }
                    }
                    purchase_item.date = p.date ?? purchase_item.date;
                    purchase_item.category_id = category_id ?? purchase_item.category_id;
                    purchase_item.product_id = product_id ?? purchase_item.product_id;
                    purchase_item.quantity = p.quantity ?? purchase_item.quantity;
                    purchase_item.unit_cost = p.unit_cost ?? purchase_item.unit_cost;
                    purchase_item.tax = p.tax ?? purchase_item.tax;
                    purchase_item.subtotal = p.subtotal ?? purchase_item.subtotal;
                    await purchase_item.save();
                    // ✅ تحديث الـ options
                    if (p.options) {
                        for (const element of p.options) {
                            if (element._id) {
                                const option_item = await purchase_item_option_1.PurchaseItemOptionModel.findById(element._id);
                                if (option_item) {
                                    option_item.option_id =
                                        element.option_id ?? option_item.option_id;
                                    await option_item.save();
                                }
                            }
                            else {
                                await purchase_item_option_1.PurchaseItemOptionModel.create({
                                    purchase_item_id: purchase_item._id,
                                    option_id: element.id,
                                });
                            }
                        }
                    }
                }
            }
            else {
                // ----------------- create -----------------
                let product_id = p.product_id;
                let category_id = p.category_id;
                if (p.product_code) {
                    const product_price = await product_price_1.ProductPriceModel.findOne({
                        code: p.product_code,
                    }).populate("productId");
                    if (product_price) {
                        product_id = product_price.productId._id;
                        category_id = product_price.productId.categoryId;
                    }
                }
                const newPurchaseItem = await purchase_item_1.PurchaseItemModel.create({
                    date: p.date,
                    purchase_id: purchase._id,
                    category_id,
                    product_id,
                    quantity: p.quantity,
                    unit_cost: p.unit_cost,
                    discount: p.discount,
                    tax: p.tax,
                    subtotal: p.subtotal,
                });
                if (p.options && Array.isArray(p.options)) {
                    for (const opt of p.options) {
                        await purchase_item_option_1.PurchaseItemOptionModel.create({
                            purchase_item_id: newPurchaseItem._id,
                            option_id: opt.id,
                        });
                    }
                }
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
