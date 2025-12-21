"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = require("../../controller/admin/products");
const validation_1 = require("../../middlewares/validation");
const products_2 = require("../../validation/admin/products");
const products_3 = require("../../controller/admin/products");
const catchAsync_1 = require("../../utils/catchAsync");
const haspremission_1 = require("../../middlewares/haspremission");
const uploadFile_1 = require("../../utils/uploadFile");
const route = (0, express_1.Router)();
// ✅ Static routes أولاً
route.post("/import", (0, haspremission_1.authorizePermissions)("product", "Add"), (0, uploadFile_1.uploadExcelFile)().single("file"), (0, catchAsync_1.catchAsync)(products_1.importProductsFromExcel));
// إنشاء منتج
route.post("/", (0, haspremission_1.authorizePermissions)("product", "Add"), (0, validation_1.validate)(products_2.createProductSchema), (0, catchAsync_1.catchAsync)(products_1.createProduct));
// جلب جميع المنتجات
route.get("/", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.getProduct));
route.get("/low-stock", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.getLowStockProducts));
route.delete("/", (0, haspremission_1.authorizePermissions)("product", "Delete"), (0, catchAsync_1.catchAsync)(products_3.deletemanyproducts));
// ✅ ضع المسارات الثابتة أولًا
route.get("/generate-code", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.generateProductCode));
route.get("/generate-barcode/:product_price_id", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.generateBarcodeImageController));
route.get("/select", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.modelsforselect));
route.post("/code", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.getProductByCode));
// بعد كده المسارات اللي فيها :id
route.get("/:id", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(products_1.getOneProduct));
route.put("/:id", (0, haspremission_1.authorizePermissions)("product", "Edit"), (0, validation_1.validate)(products_2.updateProductSchema), (0, catchAsync_1.catchAsync)(products_1.updateProduct));
route.delete("/:id", (0, haspremission_1.authorizePermissions)("product", "Delete"), (0, catchAsync_1.catchAsync)(products_1.deleteProduct));
exports.default = route;
