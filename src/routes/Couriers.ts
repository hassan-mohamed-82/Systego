import { Router } from "express";
import {createCourier,getCourierById,getCouriers,updateCourier,deleteCourier
} from "../controller/Couriers"
import {validate} from"../middlewares/validation";
import {createCourierSchema,updateCourierSchema} from "../validation/Couriers"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createCourierSchema), catchAsync(createCourier));
route.get("/",catchAsync(getCouriers));
route.get("/:id" ,catchAsync(getCourierById));
route.put("/:id" ,validate(updateCourierSchema), catchAsync(updateCourier));
route.delete("/:id",catchAsync(deleteCourier));

export default route;
