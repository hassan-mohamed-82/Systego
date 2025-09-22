import { Router } from 'express';
import { createPositionWithRolesAndActions,getAllPositions,getPositionById,updatePosition,deletePosition } from '../controller/permission';
import { validate } from '../middlewares/validation';
import { createPositionWithRolesAndActionsSchema,updatePositionWithRolesAndActionsSchema } from '../validation/permission';
import { catchAsync } from '../utils/catchAsync';
import { authenticated } from '../middlewares/authenticated';

const route = Router();

route.post("/",validate(createPositionWithRolesAndActionsSchema), catchAsync(createPositionWithRolesAndActions));
route.get("/",catchAsync(getAllPositions));
route.get("/:id",catchAsync(getPositionById));
route.put("/:id" ,validate(updatePositionWithRolesAndActionsSchema), catchAsync(updatePosition));
route.delete("/:id",catchAsync(deletePosition));

// Export the authRouter to be used in the main app
export default route;
