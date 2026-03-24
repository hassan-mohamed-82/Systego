import { Router } from "express";
import {createCourier,getCourierById,getCouriers,updateCourier,deleteCourier
} from "../../controller/admin/Couriers"
import {validate} from"../../middlewares/validation";
import {createCourierSchema,updateCourierSchema} from "../../validation/admin/Couriers"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.post("/" ,validate(createCourierSchema),authorizePermissions("courier", "Add"), catchAsync(createCourier));
route.get("/",authorizePermissions("courier", "View"),catchAsync(getCouriers));
route.get("/:id" ,authorizePermissions("courier", "View"),catchAsync(getCourierById));
route.put("/:id" ,validate(updateCourierSchema),authorizePermissions("courier", "Edit"), catchAsync(updateCourier));
route.delete("/:id",authorizePermissions("courier", "Delete"),catchAsync(deleteCourier));

export default route;
