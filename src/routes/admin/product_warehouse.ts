import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    getproductWarehouse,getproductWarehousebyid
}from "../../controller/admin/product_warehouse";
import {authorizePermissions} from "../../middlewares/haspremission"

const router=Router();

router.get("/:warehouse_id",authorizePermissions("product_warehouse","View"),catchAsync(getproductWarehouse));
router.get("/:id",authorizePermissions("product_warehouse","View"),catchAsync(getproductWarehousebyid));
export default router;
