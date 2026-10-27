import { Request, Response } from "express";
import { SaleModel, ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { ProductModel } from "../../models/schema/admin/products";
import { CategoryModel } from "../../models/schema/admin/category";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { UserModel } from "../../models/schema/admin/User";
import { SuccessResponse } from "../../utils/response";
import mongoose from "mongoose";
import { CashierModel } from "../../models/schema/admin/cashier";
import {
    resolveBranchIdsForUser,
    resolvePosIds,
    resolvePosShiftIds,
    buildBranchFilter,
    buildPosShiftFilter,
    resolveDateFilter,
} from "../../utils/reportFilters";
import Warehouse from "../../routes/admin/Warehouse";
import category from "../../routes/admin/category";

// ═══════════════════════════════════════════════════════════
// 📊 PRODUCT SALES REPORT
// ═══════════════════════════════════════════════════════════
export const getProductSalesReport = async (req: Request, res: Response) => {
    const {
        category_id,
        product_id,
        sort_by = "count",      // count, total_price, product_name
        sort_order = "desc",    // asc, desc
        search,
    } = req.query as {
        category_id?: string;
        product_id?: string;
        sort_by?: string;
        sort_order?: string;
        search?: string;
    };

    // ═══════════════════════════════════════════════════════════
    // 📅 فلتر التاريخ (يدعم start_date/startDate)
    // ═══════════════════════════════════════════════════════════
    const { start: startDate, end: endDate, filter: dateFilter } =
        resolveDateFilter(req.query);

    // ═══════════════════════════════════════════════════════════
    // 🌿 فلتر الفروع (Warehouse) وفلتر نقاط البيع (POS = Cashier)
    // ═══════════════════════════════════════════════════════════
    const branchIds = resolveBranchIdsForUser(req.query, req.user);
    const posIds = resolvePosIds(req.query);
    const shiftIds = await resolvePosShiftIds(posIds);

    // ═══════════════════════════════════════════════════════════
    // 🔍 فلتر المبيعات (المكتملة فقط)
    // ═══════════════════════════════════════════════════════════
    let salesFilter: any = {
        ...dateFilter,
        order_pending: 0,
        ...buildBranchFilter(branchIds),
        ...buildPosShiftFilter(shiftIds),
    };

    // هات الـ Sale IDs المطابقة للفلتر
    const matchingSales = await SaleModel.find(salesFilter).select("_id").lean();
    const saleIds = matchingSales.map((s) => s._id);

    if (saleIds.length === 0) {
        return SuccessResponse(res, {
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
    let productFilter: any = {
        sale_id: { $in: saleIds },
        product_id: { $ne: null },  // منتجات فقط مش bundles
    };

    if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
        productFilter.product_id = new mongoose.Types.ObjectId(product_id);
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 Aggregation
    // ═══════════════════════════════════════════════════════════
    let aggregationPipeline: any[] = [
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
    if (category_id && mongoose.Types.ObjectId.isValid(category_id)) {
        aggregationPipeline.push({
            $match: {
                "product.categoryId": new mongoose.Types.ObjectId(category_id),
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
    let sortField: any = {};
    if (sort_by === "count") {
        sortField = { count: sort_order === "asc" ? 1 : -1 };
    } else if (sort_by === "total_price") {
        sortField = { total_price: sort_order === "asc" ? 1 : -1 };
    } else if (sort_by === "product_name") {
        sortField = { product_name: sort_order === "asc" ? 1 : -1 };
    } else {
        sortField = { count: -1 };
    }

    aggregationPipeline.push({ $sort: sortField });

    // تنفيذ الـ Aggregation
    const productStats = await ProductSalesModel.aggregate(aggregationPipeline);

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

    return SuccessResponse(res, {
        message: "Product sales report generated successfully",
        period: {
            start_date: startDate ? startDate.toISOString().split("T")[0] : "All time",
            end_date: endDate ? endDate.toISOString().split("T")[0] : "All time",
        },
        filters: {
            category_id: category_id || null,
            product_id: product_id || null,
            warehouse_ids: branchIds.map((id) => id.toString()),
            cashier_ids: posIds.map((id) => id.toString()),
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




export const selection = async (req: Request, res: Response) => {
    // فلتر الفروع (الفرع = Warehouse)
    const branchIds = resolveBranchIdsForUser(req.query, req.user);

    // Missing `enabled` means a legacy branch; treat it as enabled.
    const warehouseQuery: any = { enabled: { $ne: false } };
    if (branchIds.length > 0) warehouseQuery._id = { $in: branchIds };

    // الكاشيرز (POS) — نرجع اللي تابعين للفروع المختارة فقط
    const cashierQuery: any = { status: true, cashier_active: true };
    if (branchIds.length > 0) cashierQuery.warehouse_id = { $in: branchIds };

    const [cashier, warehouses, categories, products] = await Promise.all([
        CashierModel.find(cashierQuery),
        WarehouseModel.find(warehouseQuery),
        CategoryModel.find(),
        ProductModel.find(),
    ]);

    return SuccessResponse(res, {
        message: "Product sales report generated successfully",
        cashier,
        warehouses,
        categories,
        products
    });

}