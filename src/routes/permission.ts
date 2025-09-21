import { Router } from 'express';
import { createPositionWithRolesAndActions,getAllPositions,getPositionById,updatePosition,deletePosition } from '../controller/permission';
import { validate } from '../middlewares/validation';
import { createPositionWithRolesAndActionsSchema,updatePositionWithRolesAndActionsSchema } from '../validation/permission';
import { catchAsync } from '../utils/catchAsync';
import { authenticated } from '../middlewares/authenticated';

const route = Router();

route.post("/",authenticated,validate(createPositionWithRolesAndActionsSchema), catchAsync(createPositionWithRolesAndActions));
route.get("/", authenticated,catchAsync(getAllPositions));
route.get("/:id",authenticated,catchAsync(getPositionById));
route.put("/:id",authenticated ,validate(updatePositionWithRolesAndActionsSchema), catchAsync(updatePosition));
route.delete("/:id", authenticated,catchAsync(deletePosition));

// Export the authRouter to be used in the main app
export default route;
