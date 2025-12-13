import { Router } from 'express';
import { createUser,getAllUsers,getUserById,updateUser,deleteUser,selection} from '../../controller/admin/Admin';
import { validate } from '../../middlewares/validation';
import { loginSchema } from '../../validation/admin/auth';
import { catchAsync } from '../../utils/catchAsync';
import { createUserSchema,updateUserSchema } from '../../validation/admin/Admin';
export const route = Router();

route.post("/",validate(createUserSchema), catchAsync(createUser));
route.get("/",catchAsync(getAllUsers));
route.get("/selection",catchAsync(selection));
route.get("/:id",catchAsync(getUserById));
route.put("/:id" ,validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id",catchAsync(deleteUser));

// Export the authRouter to be used in the main app
export default route;