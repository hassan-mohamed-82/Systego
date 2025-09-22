import { Router } from "express";
import {createSupplier,getSupplierById,getSuppliers,updateSupplier,deleteSupplier
} from "../controller/suppliers"
import {validate} from"../middlewares/validation";
import {createSupplierSchema,updateSupplierSchema} from "../validation/suppliers"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createSupplierSchema), catchAsync(createSupplier));
route.get("/",catchAsync(getSuppliers));
route.get("/:id" ,catchAsync(getSupplierById));
route.put("/:id" ,validate(updateSupplierSchema), catchAsync(updateSupplier));
route.delete("/:id",catchAsync(deleteSupplier));

export default route;