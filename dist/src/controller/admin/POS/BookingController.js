"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payRemaining = exports.createBooking = exports.getPOSBookings = void 0;
const Booking_1 = require("../../../models/schema/admin/Booking");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const Warehouse_1 = require("../../../models/schema/admin/Warehouse");
const products_1 = require("../../../models/schema/admin/products");
const product_price_1 = require("../../../models/schema/admin/product_price");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const getPOSBookings = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const bookings = await Booking_1.BookingModel.find({ WarehouseId: warehouseId })
        .populate('CustmerId', 'name phone_number')
        .populate('ProductId', 'name ar_name image')
        .lean();
    const pendingBookings = bookings.filter(b => b.status === "pending");
    const failerBookings = bookings.filter(b => b.status === "failer");
    const payBookings = bookings.filter(b => b.status === "pay");
    (0, response_1.SuccessResponse)(res, { message: "POS Bookings retrieved successfully", pendingBookings, failerBookings, payBookings });
};
exports.getPOSBookings = getPOSBookings;
const createBooking = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const jwtWarehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!jwtWarehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    // Check Open Shift
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a booking");
    }
    const { number_of_days, deposit, CustmerId, ProductId, CategoryId, option_id } = req.body;
    // We enforce the warehouse constraint from the jwt user
    const WarehouseId = jwtWarehouseId;
    if (!number_of_days || !deposit || !CustmerId || !ProductId || !CategoryId || !option_id) {
        throw new BadRequest_1.BadRequest("All fields are required");
    }
    const existcustmer = await customer_1.CustomerModel.findById(CustmerId);
    if (!existcustmer)
        throw new BadRequest_1.BadRequest("Customer not found");
    const existwarehouse = await Warehouse_1.WarehouseModel.findById(WarehouseId);
    if (!existwarehouse)
        throw new BadRequest_1.BadRequest("Warehouse not found");
    const existproduct = await products_1.ProductModel.findById(ProductId);
    if (!existproduct)
        throw new BadRequest_1.BadRequest("Product not found");
    const existQty = existproduct.quantity ?? 0;
    if (existQty < 1)
        throw new BadRequest_1.BadRequest("Product out of stock");
    const option = await product_price_1.ProductPriceOptionModel.findById(option_id);
    if (!option)
        throw new BadRequest_1.BadRequest("Option not found");
    const productprice = option.product_price_id;
    if (!productprice)
        throw new BadRequest_1.BadRequest("Product price not found");
    const existproductprice = await product_price_1.ProductPriceModel.findById(productprice);
    if (!existproductprice)
        throw new BadRequest_1.BadRequest("Product price not found");
    if (existproductprice.quantity < 1)
        throw new BadRequest_1.BadRequest("Product price out of stock");
    const booking = await Booking_1.BookingModel.create({
        number_of_days,
        deposit,
        CustmerId,
        WarehouseId,
        ProductId,
        CategoryId,
        option_id,
        status: "pending"
    });
    existproduct.quantity = existQty - 1;
    await existproduct.save();
    existproductprice.quantity = existproductprice.quantity - 1;
    await existproductprice.save();
    (0, response_1.SuccessResponse)(res, { message: "Booking created successfully", booking });
};
exports.createBooking = createBooking;
const payRemaining = async (req, res) => {
    const { id } = req.params;
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const warehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    // Check Open Shift
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before paying for a booking");
    }
    const booking = await Booking_1.BookingModel.findOne({ _id: id, WarehouseId: warehouseId })
        .populate('CustmerId')
        .populate('WarehouseId')
        .populate('ProductId')
        .populate('option_id');
    if (!booking)
        throw new Errors_1.NotFound("Booking not found or not assigned to your warehouse");
    if (booking.status === "pay") {
        throw new BadRequest_1.BadRequest("Booking is already paid and converted to sale");
    }
    const option = await product_price_1.ProductPriceOptionModel.findById(booking.option_id);
    if (!option)
        throw new BadRequest_1.BadRequest("Product option not found");
    const productPrice = await product_price_1.ProductPriceModel.findById(option.product_price_id);
    if (!productPrice)
        throw new BadRequest_1.BadRequest("Product price not found");
    const quantity = 1;
    const price = productPrice.price;
    const subtotal = price * quantity;
    const saleReference = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Convert booking to a completed sale
    const saleData = {
        reference: saleReference,
        customer_id: booking.CustmerId,
        warehouse_id: booking.WarehouseId,
        grand_total: subtotal,
        total: subtotal,
        paid_amount: subtotal,
        remaining_amount: 0,
        sale_status: 'completed',
        order_pending: 0,
        Due: 0,
        coupon_code: "",
        applied_coupon: false,
        cashier_id: cashierId,
        shift_id: openShift._id,
        date: new Date(),
    };
    const sale = await Sale_1.SaleModel.create(saleData);
    const productSaleData = {
        sale_id: sale._id,
        product_id: booking.ProductId,
        options_id: booking.option_id,
        quantity: quantity,
        price: price,
        subtotal: subtotal,
        isBundle: false,
    };
    await Sale_1.ProductSalesModel.create(productSaleData);
    booking.status = "pay";
    await booking.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Booking remaining balance paid successfully and converted to sale"
    });
};
exports.payRemaining = payRemaining;
