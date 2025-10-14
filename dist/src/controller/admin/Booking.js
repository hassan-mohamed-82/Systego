"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.updateBooking = exports.createbooking = exports.getBookingById = exports.getAllBookings = void 0;
const Booking_1 = require("../../models/schema/admin/Booking");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const customer_1 = require("../../models/schema/admin/POS/customer");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const products_1 = require("../../models/schema/admin/products");
const category_1 = require("../../models/schema/admin/category");
const product_price_1 = require("../../models/schema/admin/product_price");
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
const createbooking = async (req, res) => {
    const { number_of_days, deposit, CustmerId, WarehouseId, ProductId, CategoryId, option_id } = req.body;
    if (!number_of_days || !deposit || !CustmerId || !WarehouseId || !ProductId || !CategoryId || !option_id)
        throw new BadRequest_1.BadRequest("All fields are required");
    const existcustmer = await customer_1.CustomerModel.findById(CustmerId);
    if (!existcustmer)
        throw new BadRequest_1.BadRequest("Customer not found");
    const existwarehouse = await Warehouse_1.WarehouseModel.findById(WarehouseId);
    if (!existwarehouse)
        throw new BadRequest_1.BadRequest("Warehouse not found");
    const existproduct = await products_1.ProductModel.findById(ProductId);
    if (!existproduct)
        throw new BadRequest_1.BadRequest("Product not found");
    if (existproduct.quantity < 1)
        throw new BadRequest_1.BadRequest("Product out of stock");
    const booking = await Booking_1.BookingModel.create({ number_of_days,
        deposit,
        CustmerId,
        WarehouseId,
        ProductId,
        CategoryId,
        option_id,
        status: "pending"
    });
    existproduct.quantity = existproduct.quantity - 1;
    existproduct.save();
    const option = await product_price_1.ProductPriceOptionModel.findById(option_id);
    if (!option)
        throw new BadRequest_1.BadRequest("Option not found");
    const productprice = option.product_price_id;
    if (!productprice)
        throw new BadRequest_1.BadRequest("Product price not found");
    const existproductprice = await product_price_1.ProductPriceModel.findById(productprice);
    if (!existproductprice)
        throw new BadRequest_1.BadRequest("Product price not found");
    existproductprice.quantity = existproductprice.quantity - 1;
    existproductprice.save();
    if (existproductprice.quantity < 1)
        throw new BadRequest_1.BadRequest("Product price out of stock");
    (0, response_1.SuccessResponse)(res, { message: "Booking created successfully", booking });
};
exports.createbooking = createbooking;
const updateBooking = async (req, res) => {
    const { id } = req.params;
    const { number_of_days, deposit, CustmerId, WarehouseId, ProductId, CategoryId, option_id, status, } = req.body;
    const booking = await Booking_1.BookingModel.findById(id);
    if (!booking)
        throw new Errors_1.NotFound("Booking not found");
    // ✅ Validate optional relations if provided
    if (CustmerId) {
        const existcustmer = await customer_1.CustomerModel.findById(CustmerId);
        if (!existcustmer)
            throw new BadRequest_1.BadRequest("Customer not found");
    }
    if (WarehouseId) {
        const existwarehouse = await Warehouse_1.WarehouseModel.findById(WarehouseId);
        if (!existwarehouse)
            throw new BadRequest_1.BadRequest("Warehouse not found");
    }
    if (ProductId) {
        const existproduct = await products_1.ProductModel.findById(ProductId);
        if (!existproduct)
            throw new BadRequest_1.BadRequest("Product not found");
    }
    if (CategoryId) {
        const existcategory = await category_1.CategoryModel.findById(CategoryId);
        if (!existcategory)
            throw new BadRequest_1.BadRequest("Category not found");
    }
    // ✅ Validate option and price if provided
    if (option_id) {
        const option = await product_price_1.ProductPriceOptionModel.findById(option_id);
        if (!option)
            throw new BadRequest_1.BadRequest("Option not found");
        const productprice = option.product_price_id;
        const existproductprice = await product_price_1.ProductPriceModel.findById(productprice);
        if (!existproductprice)
            throw new BadRequest_1.BadRequest("Product price not found");
    }
    // ✅ Update allowed fields
    if (number_of_days !== undefined)
        booking.number_of_days = number_of_days;
    if (deposit !== undefined)
        booking.deposit = deposit;
    if (CustmerId !== undefined)
        booking.CustmerId = CustmerId;
    if (WarehouseId !== undefined)
        booking.WarehouseId = WarehouseId;
    if (ProductId !== undefined)
        booking.ProductId = ProductId;
    if (CategoryId !== undefined)
        booking.CategoryId = CategoryId;
    if (option_id !== undefined)
        booking.option_id = option_id;
    if (status !== undefined)
        booking.status = status;
    await booking.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Booking updated successfully",
        booking,
    });
};
exports.updateBooking = updateBooking;
const deleteBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking_1.BookingModel.findById(id);
    if (!booking)
        throw new Errors_1.NotFound("Booking not found");
    // ❌ allow delete only if pending
    if (booking.status !== "pending") {
        throw new BadRequest_1.BadRequest("Only pending bookings can be deleted");
    }
    // ✅ Return product quantity
    if (booking.ProductId && booking.ProductId.length > 0) {
        const product = await products_1.ProductModel.findById(booking.ProductId[0]);
        if (product) {
            product.quantity = product.quantity + 1;
            await product.save();
        }
    }
    // ✅ Return option quantity (product_price)
    if (booking.option_id) {
        const option = await product_price_1.ProductPriceOptionModel.findById(booking.option_id);
        if (option) {
            const price = await product_price_1.ProductPriceModel.findById(option.product_price_id);
            if (price) {
                price.quantity = price.quantity + 1;
                await price.save();
            }
        }
    }
    await booking.deleteOne();
    (0, response_1.SuccessResponse)(res, {
        message: "Booking deleted successfully and quantities restored",
    });
};
exports.deleteBooking = deleteBooking;
