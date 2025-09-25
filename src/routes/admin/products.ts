import { Router } from "express";
import {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
  generateBarcodeImageController,
  generateProductCode
} from "../../controller/admin/products";
import { validate } from "../../middlewares/validation";
import { createproductSchema, updateproductSchema } from "../../validation/admin/products";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

// إنشاء منتج
route.post("/", validate(createproductSchema), catchAsync(createProduct));

// جلب جميع المنتجات
route.get("/", catchAsync(getProducts));

// توليد كود منتج فريد
route.get("/generate-code", catchAsync(generateProductCode));

// توليد صورة الباركود لمنتج موجود
route.get("/generate-barcode/:product_id", catchAsync(generateBarcodeImageController));

// جلب منتج حسب الـ id
route.get("/:id", catchAsync(getProductById));

// تحديث منتج
route.put("/:id", validate(updateproductSchema), catchAsync(updateProduct));

// حذف منتج
route.delete("/:id", catchAsync(deleteProduct));

export default route;
