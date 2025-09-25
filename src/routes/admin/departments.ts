import { Router } from "express";
import {createDepartment,getDepartmentById,getAllDepartments,updateDepartment,deleteDepartment
} from "../../controller/admin/departments"
import {validate} from"../../middlewares/validation";
import {createDepartmentSchema,updateDepartmentSchema} from "../../validation/admin/departments"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createDepartmentSchema), catchAsync(createDepartment));
route.get("/",catchAsync(getAllDepartments));
route.get("/:id" ,catchAsync(getDepartmentById));
route.put("/:id" ,validate(updateDepartmentSchema), catchAsync(updateDepartment));
route.delete("/:id",catchAsync(deleteDepartment));

export default route;