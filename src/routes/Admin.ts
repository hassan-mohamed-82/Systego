import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser } from '../controller/Admin';
import { validate } from '../middlewares/validation';
import { loginSchema } from '../validation/auth';
import { catchAsync } from '../utils/catchAsync';
import { authenticated } from '../middlewares/authenticated';
import { createUserSchema,updateUserSchema } from '../validation/Admin';
export const route = Router();

route.post("/",authenticated,validate(createUserSchema), catchAsync(createUser));
route.get("/", authenticated,catchAsync(getAllUsers));
route.get("/:id",authenticated,catchAsync(getUserById));
route.put("/:id",authenticated ,validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id", authenticated,catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;