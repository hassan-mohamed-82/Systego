import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getBookingById, getAllBookings } from "../../controller/admin/Booking";
import { authorizePermissions } from "../../middlewares/haspremission";

const route = Router();

route.get("/", authorizePermissions("Booking", "View"), catchAsync(getAllBookings));
route.get("/:id", authorizePermissions("Booking", "View"), catchAsync(getBookingById));

export default route;