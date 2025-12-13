import { Router } from "express";
import {
createCurrency,getCurrencyById,getCurrencies,updateCurrency,deleteCurrency
} from "../../controller/admin/Currency"
import {validate} from"../../middlewares/validation";
import {createCurrencySchema,updateCurrencySchema} from "../../validation/admin/Currency"
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();
route.post("/" ,authorizePermissions("currency","Add"), validate(createCurrencySchema), catchAsync(createCurrency));
route.get("/",authorizePermissions("currency","View"),catchAsync(getCurrencies));
route.get("/:id" ,authorizePermissions("currency","View"),catchAsync(getCurrencyById));
route.put("/:id" ,authorizePermissions("currency","Edit"),validate(updateCurrencySchema), catchAsync(updateCurrency));
route.delete("/:id",authorizePermissions("currency","Delete"),catchAsync(deleteCurrency));

export default route;