// routes/admin/categoryRoutes.ts
import { Router } from "express";
import {
  createcategory,
  getCategoryById,
  getCategories,
  updateCategory,
  deleteCategory,
  importCategoriesFromExcel,
  deletemanycategories,
} from "../../controller/admin/category";
import { validate } from "../../middlewares/validation";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../../validation/admin/category";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";
import { uploadExcelFile } from "../../utils/uploadFile";

const route = Router();

// ✅ Static routes أولاً
route.post(
  "/import",
  authorizePermissions("category", "Add"),
  uploadExcelFile().single("file"),
  catchAsync(importCategoriesFromExcel)
);

route.delete("/",authorizePermissions("category","Delete"),catchAsync(deletemanycategories));
// CRUD
route.post(
  "/",
  authorizePermissions("category", "Add"),
  validate(createCategorySchema),
  catchAsync(createcategory)
);

route.get(
  "/",
  authorizePermissions("category", "View"),
  catchAsync(getCategories)
);

// ✅ Dynamic routes آخراً
route.get(
  "/:id",
  authorizePermissions("category", "View"),
  catchAsync(getCategoryById)
);

route.put(
  "/:id",
  authorizePermissions("category", "Edit"),
  validate(updateCategorySchema),
  catchAsync(updateCategory)
);

route.delete(
  "/:id",
  authorizePermissions("category", "Delete"),
  catchAsync(deleteCategory)
);

export default route;
