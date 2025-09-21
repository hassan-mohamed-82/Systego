import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser } from '../controller/Admin';
import { validate } from '../middlewares/validation';
import { loginSchema } from '../validation/auth';
import { catchAsync } from '../utils/catchAsync';
import { authenticated } from '../middlewares/authenticated';
import { createUserSchema,updateUserSchema } from '../validation/Admin';
import { authorizeRoles } from '../middlewares/authorized';
export const route = Router();

route.post("/",authenticated,authorizeRoles("admin") ,validate(createUserSchema), catchAsync(createUser));
route.get("/", authenticated,authorizeRoles("admin"),catchAsync(getAllUsers));
route.get("/:id",authenticated,authorizeRoles("admin") ,catchAsync(getUserById));
route.put("/:id",authenticated ,authorizeRoles("admin"),validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id", authenticated,authorizeRoles("admin"),catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;