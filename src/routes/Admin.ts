import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser } from '../controller/Admin';
import { validate } from '../middlewares/validation';
import { loginSchema } from '../validation/auth';
import { catchAsync } from '../utils/catchAsync';
import {  authorize} from '../middlewares/authorized';
import { createUserSchema,updateUserSchema } from '../validation/Admin';
export const route = Router();

route.post("/",authorize("add"),validate(createUserSchema), catchAsync(createUser));
route.get("/",authorize("get"),catchAsync(getAllUsers));
route.get("/:id",authorize("get"),catchAsync(getUserById));
route.put("/:id" ,authorize("update"),validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id",authorize("delete"),catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;