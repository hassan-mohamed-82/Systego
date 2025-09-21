import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser } from '../controller/Admin';
import { validate } from '../middlewares/validation';
import { loginSchema } from '../validation/auth';
import { catchAsync } from '../utils/catchAsync';
import { authenticated } from '../middlewares/authenticated';
import { createUserSchema,updateUserSchema } from '../validation/Admin';
import { authorizeRoles } from '../middlewares/authorized';
export const route = Router();

route.post("/",authenticated,authorizeRoles("Admin") ,validate(createUserSchema), catchAsync(createUser));
route.get("/", authenticated,authorizeRoles("Admin"),catchAsync(getAllUsers));
route.get("/:id",authenticated,authorizeRoles("Admin") ,catchAsync(getUserById));
route.put("/:id",authenticated ,authorizeRoles("Admin"),validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id", authenticated,authorizeRoles("Admin"),catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;