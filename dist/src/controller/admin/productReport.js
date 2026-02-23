"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selection = exports.getProductSalesReport = void 0;
const Sale_1 = require("../../models/schema/admin/POS/Sale");
const products_1 = require("../../models/schema/admin/products");
const category_1 = require("../../models/schema/admin/category");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const response_1 = require("../../utils/response");
const mongoose_1 = __importDefault(require("mongoose"));
const cashier_1 = require("../../models/schema/admin/cashier");
// ═══════════════════════════════════════════════════════════
// 📊 PRODUCT SALES REPORT
// ═══════════════════════════════════════════════════════════
const getProductSalesReport = async (req, res) => {
    const { category_id, product_id, warehouse_id, cashier_id, start_date, end_date, sort_by = "count", // count, total_price, product_name
    sort_order = "desc", // asc, desc
    search, } = req.body;
    // ═══════════════════════════════════════════════════════════
    // 📅 فلتر التاريخ
    // ═══════════════════════════════════════════════════════════
    let dateFilter = {};
    if (start_date && end_date) {
        dateFilter.createdAt = {
            $gte: new Date(start_date),
            $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)),
        };
    }
    else if (start_date) {
        dateFilter.createdAt = { $gte: new Date(start_date) };
    }
    else if (end_date) {
        dateFilter.createdAt = { $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)) };
    }
    // ═══════════════════════════════════════════════════════════
    // 🔍 فلتر المبيعات (المكتملة فقط)
    // ═══════════════════════════════════════════════════════════
    let salesFilter = {
        ...dateFilter,
        order_pending: 0
    };
    if (warehouse_id && mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
        salesFilter.warehouse_id = new mongoose_1.default.Types.ObjectId(warehouse_id);
    }
    if (cashier_id && mongoose_1.default.Types.ObjectId.isValid(cashier_id)) {
        salesFilter.cashier_id = new mongoose_1.default.Types.ObjectId(cashier_id);
    }
    // هات الـ Sale IDs المطابقة للفلتر
    const matchingSales = await Sale_1.SaleModel.find(salesFilter).select("_id").lean();
    const saleIds = matchingSales.map((s) => s._id);
    if (saleIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No sales found for the given filters",
            total_products: 0,
            total_count: 0,
            total_revenue: 0,
            products: [],
        });
    }
    // ═══════════════════════════════════════════════════════════
    // 📦 فلتر المنتجات
    // ═══════════════════════════════════════════════════════════
    let productFilter = {
        sale_id: { $in: saleIds },
        product_id: { $ne: null }, // منتجات فقط مش bundles
    };
    if (product_id && mongoose_1.default.Types.ObjectId.isValid(product_id)) {
        productFilter.product_id = new mongoose_1.default.Types.ObjectId(product_id);
    }
    // ═══════════════════════════════════════════════════════════
    // 📊 Aggregation
    // ═══════════════════════════════════════════════════════════
    let aggregationPipeline = [
        { $match: productFilter },
        // جلب بيانات المنتج
        {
            $lookup: {
                from: "products",
                localField: "product_id",
                foreignField: "_id",
                as: "product",
            },
        },
        { $unwind: "$product" },
        // جلب بيانات الـ Category
        {
            $lookup: {
                from: "categories",
                localField: "product.categoryId",
                foreignField: "_id",
                as: "category",
            },
        },
        {
            $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true
            }
        },
    ];
    // فلتر الـ Category
    if (category_id && mongoose_1.default.Types.ObjectId.isValid(category_id)) {
        aggregationPipeline.push({
            $match: {
                "product.categoryId": new mongoose_1.default.Types.ObjectId(category_id),
            },
        });
    }
    // فلتر البحث
    if (search && search.trim() !== "") {
        aggregationPipeline.push({
            $match: {
                $or: [
                    { "product.name": { $regex: search, $options: "i" } },
                    { "product.ar_name": { $regex: search, $options: "i" } },
                ],
            },
        });
    }
    // تجميع حسب المنتج
    aggregationPipeline.push({
        $group: {
            _id: "$product_id",
            product_name: { $first: "$product.name" },
            product_ar_name: { $first: "$product.ar_name" },
            product_image: { $first: "$product.image" },
            product_code: { $first: "$product.code" },
            category_id: { $first: "$category._id" },
            category_name: { $first: "$category.name" },
            category_ar_name: { $first: "$category.ar_name" },
            count: { $sum: "$quantity" },
            total_price: { $sum: "$subtotal" },
            orders_count: { $sum: 1 },
            avg_price: { $avg: "$price" },
        },
    });
    // الترتيب
    let sortField = {};
    if (sort_by === "count") {
        sortField = { count: sort_order === "asc" ? 1 : -1 };
    }
    else if (sort_by === "total_price") {
        sortField = { total_price: sort_order === "asc" ? 1 : -1 };
    }
    else if (sort_by === "product_name") {
        sortField = { product_name: sort_order === "asc" ? 1 : -1 };
    }
    else {
        sortField = { count: -1 };
    }
    aggregationPipeline.push({ $sort: sortField });
    // تنفيذ الـ Aggregation
    const productStats = await Sale_1.ProductSalesModel.aggregate(aggregationPipeline);
    // ═══════════════════════════════════════════════════════════
    // 📈 حساب الإجماليات
    // ═══════════════════════════════════════════════════════════
    const totalCount = productStats.reduce((sum, p) => sum + p.count, 0);
    const totalRevenue = productStats.reduce((sum, p) => sum + p.total_price, 0);
    // ═══════════════════════════════════════════════════════════
    // 📤 تنسيق الـ Response
    // ═══════════════════════════════════════════════════════════
    const formattedProducts = productStats.map((p, index) => ({
        rank: index + 1,
        product_id: p._id,
        product_name: p.product_name,
        product_ar_name: p.product_ar_name,
        product_image: p.product_image,
        product_code: p.product_code,
        category: {
            _id: p.category_id,
            name: p.category_name,
            ar_name: p.category_ar_name,
        },
        count: p.count,
        total_price: Number(p.total_price.toFixed(2)),
        orders_count: p.orders_count,
        avg_price: Number(p.avg_price.toFixed(2)),
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Product sales report generated successfully",
        period: {
            start_date: start_date || "All time",
            end_date: end_date || "All time",
        },
        filters: {
            category_id: category_id || null,
            product_id: product_id || null,
            warehouse_id: warehouse_id || null,
            cashier_id: cashier_id || null,
            search: search || null,
        },
        summary: {
            total_products: formattedProducts.length,
            total_count: totalCount,
            total_revenue: Number(totalRevenue.toFixed(2)),
        },
        products: formattedProducts,
    });
};
exports.getProductSalesReport = getProductSalesReport;
const selection = async (req, res) => {
    const cashier = await cashier_1.CashierModel.find({ status: true });
    const warehouses = await Warehouse_1.WarehouseModel.find();
    const categories = await category_1.CategoryModel.find();
    const products = await products_1.ProductModel.find();
    return (0, response_1.SuccessResponse)(res, {
        message: "Product sales report generated successfully",
        cashier,
        warehouses,
        categories,
        products
    });
};
exports.selection = selection;
