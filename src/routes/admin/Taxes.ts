import { Router } from "express";
import {createTaxes,getTaxesById,getTaxes,updateTaxes,deleteTaxes
} from "../../controller/admin/Taxes"
import {validate} from"../../middlewares/validation";
import {createTaxesSchema,updateTaxesSchema} from "../../validation/admin/Taxes"
import { catchAsync } from "../../utils/catchAsync";

const route = Router();
route.post("/" ,validate(createTaxesSchema), catchAsync(createTaxes));
route.get("/",catchAsync(getTaxes));
route.get("/:id" ,catchAsync(getTaxesById));
route.put("/:id" ,validate(updateTaxesSchema), catchAsync(updateTaxes));
route.delete("/:id",catchAsync(deleteTaxes));

export default route;

