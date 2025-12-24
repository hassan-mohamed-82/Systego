import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
  addProductToWarehouse,
  updateProductStock,
  removeProductFromWarehouse,
  getWarehouseProducts,
  // transferStock,
  getAllStocks,
  getLowStockProducts,
} from "../../controller/admin/product_warehouse";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

router.post("/", authorizePermissions("product_warehouse", "Add"), catchAsync(addProductToWarehouse));
router.delete("/", authorizePermissions("product_warehouse", "Delete"), catchAsync(removeProductFromWarehouse));
router.get("/low-stock", authorizePermissions("product_warehouse", "View"), catchAsync(getLowStockProducts));
router.put("/:id", authorizePermissions("product_warehouse", "Edit"), catchAsync(updateProductStock));
router.get("/:warehouseId", authorizePermissions("product_warehouse", "View"), catchAsync(getWarehouseProducts));
router.get("/", authorizePermissions("product_warehouse", "View"), catchAsync(getAllStocks));

export default router;