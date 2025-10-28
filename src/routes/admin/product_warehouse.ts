import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    getproductWarehouse,getproductWarehousebyid
}from "../../controller/admin/product_warehouse";

const router=Router();

router.get("/:warehouse_id",catchAsync(getproductWarehouse));
router.get("/:id",catchAsync(getproductWarehousebyid));
export default router;
