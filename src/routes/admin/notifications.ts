import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {getAllNotifications,getNotificationById } from "../../controller/admin/Notfication";

const router = Router();

router.get("/",catchAsync(getAllNotifications));
router.get("/:id",catchAsync(getNotificationById));
export default router;