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
  modelsforselect
} from "../../controller/admin/products";
import { validate } from "../../middlewares/validation";
import { createProductSchema, updateProductSchema } from "../../validation/admin/products";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

// إنشاء منتج
route.post("/", validate(createProductSchema), catchAsync(createProduct));

// جلب جميع المنتجات
route.get("/", catchAsync(getProduct));

// ✅ ضع المسارات الثابتة أولًا
route.get("/generate-code", catchAsync(generateProductCode));
route.get("/generate-barcode/:product_price_id", catchAsync(generateBarcodeImageController));
route.get("/select", catchAsync(modelsforselect));
route.post("/code", catchAsync(getProductByCode));

// بعد كده المسارات اللي فيها :id
route.get("/:id", catchAsync(getOneProduct));
route.put("/:id", validate(updateProductSchema), catchAsync(updateProduct));
route.delete("/:id", catchAsync(deleteProduct));

export default route;
