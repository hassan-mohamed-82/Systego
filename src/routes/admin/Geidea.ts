import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
	createGeidea,
	updateGeidea,
	getGeidea,
	getGeideaById,
	deleteGeideaConfig,
} from "../../controller/admin/Geidea";

const geideaRoute = Router();

geideaRoute.get("/", catchAsync(getGeidea));
geideaRoute.post("/", catchAsync(createGeidea));
geideaRoute.put("/:id", catchAsync(updateGeidea));
geideaRoute.get("/:id", catchAsync(getGeideaById));
geideaRoute.delete("/:id", catchAsync(deleteGeideaConfig));


export default geideaRoute;