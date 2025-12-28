import { Router } from "express";
import {
    createzone, getZoneById, getZones, updateZone, deleteZone,getCountriesWithCities
} from "../../controller/admin/Zone"
import {validate} from"../../middlewares/validation";
import {createZoneSchema,updateZoneSchema} from "../../validation/admin/Zone"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions}from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("zone","Add"),validate(createZoneSchema), catchAsync(createzone));
route.get("/countries",authorizePermissions("zone","View"),catchAsync(getCountriesWithCities));
route.get("/",authorizePermissions("zone","View"),catchAsync(getZones));
route.get("/:id",authorizePermissions("zone","View"),catchAsync(getZoneById));
route.put("/:id" ,authorizePermissions("zone","Edit"),validate(updateZoneSchema), catchAsync(updateZone));
route.delete("/:id",authorizePermissions("zone","Delete"),catchAsync(deleteZone));
export default route;