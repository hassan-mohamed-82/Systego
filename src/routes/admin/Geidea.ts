import { Router } from "express";
import { addOrUpdateGeideaConfig, getGeideaConfig ,deleteGeideaConfig} from "../../controller/admin/Geidea";

const geideaRoute = Router();

geideaRoute.post("/", addOrUpdateGeideaConfig);
geideaRoute.get("/", getGeideaConfig);
geideaRoute.delete("/", deleteGeideaConfig);


export default geideaRoute;