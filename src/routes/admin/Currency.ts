import { Router } from "express";
import {
createCurrency,getCurrencyById,getCurrencies,updateCurrency,deleteCurrency
} from "../../controller/admin/Currency"
import {validate} from"../../middlewares/validation";
import {createCurrencySchema,updateCurrencySchema} from "../../validation/admin/Currency"
import { catchAsync } from "../../utils/catchAsync";

const route = Router();
route.post("/" ,validate(createCurrencySchema), catchAsync(createCurrency));
route.get("/",catchAsync(getCurrencies));
route.get("/:id" ,catchAsync(getCurrencyById));
route.put("/:id" ,validate(updateCurrencySchema), catchAsync(updateCurrency));
route.delete("/:id",catchAsync(deleteCurrency));

export default route;