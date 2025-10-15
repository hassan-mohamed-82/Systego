import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { createbooking, getBookingById, deleteBooking ,getAllBookings,updateBooking, convertToSale } from "../../controller/admin/Booking";
import { validate } from "../../middlewares/validation";
import { createBookingSchema, updateBookingSchema } from "../../validation/admin/Booking";

const route = Router();
route.post("/", validate(createBookingSchema), catchAsync(createbooking));
route.get("/", catchAsync(getAllBookings));
route.get("/:id", catchAsync(getBookingById));
route.patch("/convert/:id", catchAsync(convertToSale));
route.put("/:id", validate(updateBookingSchema), catchAsync(updateBooking));
route.delete("/:id", catchAsync(deleteBooking));

export default route;