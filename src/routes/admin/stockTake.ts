import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
  createStocktake,
  getStocktakes,
  getStocktakeById,
  cancelStocktake,
  getStocktakeItems,
  updateStocktakeItem,
  bulkUpdateStocktakeItems,
  exportStocktakeSheet,
  importStocktakeSheet,
  submitStocktake,
} from "../../controller/admin/stockTake";
import { uploadExcelFile } from "../../utils/uploadFile";

const route = Router();

route.get("/", catchAsync(getStocktakes));
route.get("/:id", catchAsync(getStocktakeById));
route.post("/",  catchAsync(createStocktake));
route.delete("/:id",  catchAsync(cancelStocktake));

route.get("/:id/items",  catchAsync(getStocktakeItems));
route.patch("/:id/items/:itemId",  catchAsync(updateStocktakeItem));
route.put("/:id/items",  catchAsync(bulkUpdateStocktakeItems));

route.get("/:id/export", catchAsync(exportStocktakeSheet));
route.post(
  "/:id/import",
  uploadExcelFile().single("file"),
  catchAsync(importStocktakeSheet)
);

route.post("/:id/submit",  catchAsync(submitStocktake));

export default route;