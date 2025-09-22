import { Router } from "express";
import {createWarehouse,getWarehouseById,getWarehouses,updateWarehouse,deleteWarehouse
} from "../controller/Warehouse"
import {validate} from"../middlewares/validation";
import {createWarehouseSchema,updateWarehouseSchema} from "../validation/Warehouse"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createWarehouseSchema), catchAsync(createWarehouse));
route.get("/",catchAsync(getWarehouses));
route.get("/:id" ,catchAsync(getWarehouseById));
route.put("/:id" ,validate(updateWarehouseSchema), catchAsync(updateWarehouse));
route.delete("/:id",catchAsync(deleteWarehouse));

export default route;