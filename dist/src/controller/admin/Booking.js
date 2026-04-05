"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingById = exports.getAllBookings = void 0;
const Booking_1 = require("../../models/schema/admin/Booking");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const getAllBookings = async (req, res) => {
    const pendingBookings = await Booking_1.BookingModel.find({ status: "pending" });
    const failerBookings = await Booking_1.BookingModel.find({ status: "failer" });
    const payBookings = await Booking_1.BookingModel.find({ status: "pay" });
    (0, response_1.SuccessResponse)(res, { message: "Bookings retrieved successfully", pendingBookings, failerBookings, payBookings });
};
exports.getAllBookings = getAllBookings;
const getBookingById = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking_1.BookingModel.findById(id);
    if (!booking)
        throw new Errors_1.NotFound("Booking not found");
    (0, response_1.SuccessResponse)(res, { message: "Booking retrieved successfully", booking });
};
exports.getBookingById = getBookingById;
