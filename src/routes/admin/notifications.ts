import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getAllNotifications, getNotificationById, markNotificationAsRead, markAllNotificationsAsRead } from "../../controller/admin/Notfication";
import { authorizePermissions } from "../../middlewares/haspremission"

const router = Router();

router.get("/", authorizePermissions("notification", "View"), catchAsync(getAllNotifications));
router.get("/:id", authorizePermissions("notification", "View"), catchAsync(getNotificationById));
router.put("/read-all", authorizePermissions("notification", "Edit"), catchAsync(markAllNotificationsAsRead));
router.put("/:id/read", authorizePermissions("notification", "Edit"), catchAsync(markNotificationAsRead));
export default router;