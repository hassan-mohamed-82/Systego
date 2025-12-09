import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser,selection} from '../../controller/admin/Admin';
import { validate } from '../../middlewares/validation';
import { loginSchema } from '../../validation/admin/auth';
import { catchAsync } from '../../utils/catchAsync';
import {  authorize} from '../../middlewares/authorized';
import { createUserSchema,updateUserSchema } from '../../validation/admin/Admin';
export const route = Router();

route.post("/",authorize("add"),validate(createUserSchema), catchAsync(createUser));
route.get("/",authorize("get"),catchAsync(getAllUsers));
route.get("/selection",authorize("get"),catchAsync(selection));
route.get("/:id",authorize("get"),catchAsync(getUserById));
route.put("/:id" ,authorize("update"),validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id",authorize("delete"),catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;