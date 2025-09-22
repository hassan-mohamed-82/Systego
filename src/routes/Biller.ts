import { Router } from "express";
import {createBiller,getBillerById,getBillers,updateBiller,deleteBiller} from "../controller/Biller"
import {validate} from"../middlewares/validation";
import {createBillerSchema,updateBillerSchema} from "../validation/Biller"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createBillerSchema), catchAsync(createBiller));
route.get("/",catchAsync(getBillers));
route.get("/:id" ,catchAsync(getBillerById));
route.put("/:id" ,validate(updateBillerSchema), catchAsync(updateBiller));
route.delete("/:id",catchAsync(deleteBiller));

export default route;
