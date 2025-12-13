import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { createbooking, getBookingById, deleteBooking ,getAllBookings,updateBooking, convertToSale } from "../../controller/admin/Booking";
import { validate } from "../../middlewares/validation";
import { createBookingSchema, updateBookingSchema } from "../../validation/admin/Booking";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();
route.post("/",authorizePermissions("Booking","Add"),validate(createBookingSchema), catchAsync(createbooking));
route.get("/", authorizePermissions("Booking","View"),catchAsync(getAllBookings));
route.get("/:id",authorizePermissions("Booking","View"), catchAsync(getBookingById));
route.patch("/convert/:id",authorizePermissions("Booking","Edit"), catchAsync(convertToSale));
route.put("/:id",authorizePermissions("Booking","Edit"), validate(updateBookingSchema), catchAsync(updateBooking));
route.delete("/:id",authorizePermissions("Booking","Delete"), catchAsync(deleteBooking));

export default route;