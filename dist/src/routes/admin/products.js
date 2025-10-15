"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = require("../../controller/admin/products");
const validation_1 = require("../../middlewares/validation");
const products_2 = require("../../validation/admin/products");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
// إنشاء منتج
route.post("/", (0, validation_1.validate)(products_2.createProductSchema), (0, catchAsync_1.catchAsync)(products_1.createProduct));
// جلب جميع المنتجات
route.get("/", (0, catchAsync_1.catchAsync)(products_1.getProduct));
// توليد كود منتج فريد
route.get("/generate-code", (0, catchAsync_1.catchAsync)(products_1.generateProductCode));
// توليد صورة الباركود لمنتج موجود
route.get("/generate-barcode/:product_price_id", (0, catchAsync_1.catchAsync)(products_1.generateBarcodeImageController));
// جلب منتج حسب الـ id
route.get("/:id", (0, catchAsync_1.catchAsync)(products_1.getOneProduct));
route.post("/code", (0, catchAsync_1.catchAsync)(products_1.getProductByCode));
// تحديث منتج
route.put("/:id", (0, validation_1.validate)(products_2.updateProductSchema), (0, catchAsync_1.catchAsync)(products_1.updateProduct));
// حذف منتج
route.delete("/:id", (0, catchAsync_1.catchAsync)(products_1.deleteProduct));
exports.default = route;
