import { Router } from "express";
import {
  createProduct,
  getProduct,
  getOneProduct,
  updateProduct,
  deleteProduct,
  generateBarcodeImageController,
  generateProductCode,
  getProductByCode,
  modelsforselect,
  importProductsFromExcel
} from "../../controller/admin/products";
import { validate } from "../../middlewares/validation";
import { createProductSchema, updateProductSchema } from "../../validation/admin/products";
import { deletemanyproducts } from "../../controller/admin/products";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"
import { uploadExcelFile } from "../../utils/uploadFile";

const route = Router();
// ✅ Static routes أولاً
route.post(
  "/import",
  authorizePermissions("product", "Add"),
  uploadExcelFile().single("file"),
  catchAsync(importProductsFromExcel)
);
// إنشاء منتج
route.post("/",authorizePermissions("product","Add"), validate(createProductSchema), catchAsync(createProduct));

// جلب جميع المنتجات
route.get("/",authorizePermissions("product","View"), catchAsync(getProduct));
route.delete("/",authorizePermissions("product","Delete"), catchAsync(deletemanyproducts)); 
// ✅ ضع المسارات الثابتة أولًا
route.get("/generate-code",authorizePermissions("product","View"), catchAsync(generateProductCode));
route.get("/generate-barcode/:product_price_id", authorizePermissions("product","View"), catchAsync(generateBarcodeImageController));
route.get("/select",authorizePermissions("product","View"), catchAsync(modelsforselect));
route.post("/code",authorizePermissions("product","View"), catchAsync(getProductByCode));

// بعد كده المسارات اللي فيها :id
route.get("/:id",authorizePermissions("product","View"), catchAsync(getOneProduct));
route.put("/:id",authorizePermissions("product","Edit"), validate(updateProductSchema), catchAsync(updateProduct));
route.delete("/:id",authorizePermissions("product","Delete"), catchAsync(deleteProduct));

export default route;
