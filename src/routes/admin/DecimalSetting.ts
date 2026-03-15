import { Router } from "express";
import { getDecimalSetting, updateDecimalSetting } from "../../controller/admin/DecimalSetting";
import { validate } from "../../middlewares/validation";
import { updateDecimalSettingSchema } from "../../validation/admin/DecimalSetting";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.get("/", catchAsync(getDecimalSetting));
route.put("/", validate(updateDecimalSettingSchema), catchAsync(updateDecimalSetting));

export default route;
