import { Router } from "express";
import {
    createzone, getZoneById, getZones, updateZone, deleteZone
} from "../../controller/admin/Zone"
import {validate} from"../../middlewares/validation";
import {createZoneSchema,updateZoneSchema} from "../../validation/admin/Zone"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();
route.post("/" ,validate(createZoneSchema) ,catchAsync(createzone));
route.get("/",catchAsync(getZones));
route.get("/:id" ,catchAsync(getZoneById));
route.put("/:id" ,validate(updateZoneSchema), catchAsync(updateZone));
route.delete("/:id",catchAsync(deleteZone));
export default route;