import { Router } from 'express';
import {updateUserPermissions,getUserPermissions,deleteUserPermissionAction} from '../../controller/admin/permission';
import { validate } from '../../middlewares/validation';
import { catchAsync } from '../../utils/catchAsync';
import { authenticated } from '../../middlewares/authenticated';

const route = Router();

route.put("/:id" , catchAsync(updateUserPermissions));
route.get("/:id",catchAsync(getUserPermissions));
route.delete("/:userId/:module/:actionId",catchAsync(deleteUserPermissionAction));


// Export the authRouter to be used in the main app
export default route;
