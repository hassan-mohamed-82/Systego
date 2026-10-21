import { Router } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { authorizePermissions } from "../../../middlewares/haspremission";
import {
  getPOSWarehouseDestinations,
  getPOSWarehouseProducts,
} from "../../../controller/admin/POS/POSWarehouseController";

const router = Router();

// GET /api/admin/pos/warehouse/products
router.get(
  "/products",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseProducts),
);

// GET /api/admin/pos/warehouse/destinations
router.get(
  "/destinations",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseDestinations),
);

// GET /api/admin/pos/warehouse/:warehouseId
// Alias of /products so the POS page can call the same shape/path as the
// admin page `/product_warehouse/:warehouseId`. Must stay after the static
// routes above.
router.get(
  "/:warehouseId",
  authorizePermissions("POS", "View"),
  catchAsync(getPOSWarehouseProducts),
);

export default router;
