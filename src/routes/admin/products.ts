import { Router } from "express";
import {
  createProduct,
  getProduct,
getOneProduct,
  updateProduct,
  deleteProduct,
  generateBarcodeImageController,
  generateProductCode
} from "../../controller/admin/products";
import { validate } from "../../middlewares/validation";
import { createProductSchema,updateProductSchema} from "../../validation/admin/products";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

// إنشاء منتج
route.post("/", validate(createProductSchema), 
catchAsync(createProduct));

// جلب جميع المنتجات
route.get("/", catchAsync(getProduct));

// توليد كود منتج فريد
route.get("/generate-code", catchAsync(generateProductCode));

// توليد صورة الباركود لمنتج موجود
route.get("/generate-barcode/:product_price_id", catchAsync(generateBarcodeImageController));

// جلب منتج حسب الـ id
route.get("/:id", catchAsync(getOneProduct));

// تحديث منتج
route.put("/:id", validate(updateProductSchema), 
catchAsync(updateProduct));

// حذف منتج
route.delete("/:id", catchAsync(deleteProduct));

export default route;
