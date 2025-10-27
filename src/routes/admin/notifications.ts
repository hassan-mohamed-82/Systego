import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {getAllNotifications,getNotificationById ,getallnotficationsunread} from "../../controller/admin/Notfication";

const router = Router();

router.get("/",catchAsync(getAllNotifications));
router.get("/:id",catchAsync(getNotificationById));
router.get("/unread",catchAsync(getallnotficationsunread));
export default router;