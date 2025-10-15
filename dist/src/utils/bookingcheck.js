"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const Booking_1 = require("../models/schema/admin/Booking");
const products_1 = require("../models/schema/admin/products");
const product_price_1 = require("../models/schema/admin/product_price");
node_cron_1.default.schedule("0 * * * *", async () => {
    try {
        console.log("⏰ Checking pending bookings...");
        const now = new Date();
        const pendingBookings = await Booking_1.BookingModel.find({ status: "pending" });
        for (const booking of pendingBookings) {
            if (!booking.createdAt)
                continue;
            const createdAt = new Date(booking.createdAt);
            const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            // ✅ Check if booking exceeded its allowed days
            if (diffDays >= booking.number_of_days) {
                booking.status = "failer";
                await booking.save();
                // ✅ Restore product quantity (if exists)
                if (booking.ProductId) {
                    const product = await products_1.ProductModel.findById(booking.ProductId);
                    if (product) {
                        product.quantity += 1;
                        await product.save();
                        console.log(`↩️ Restored quantity for product ${product._id}`);
                    }
                }
                // ✅ Restore product price quantity (if exists)
                if (booking.option_id) {
                    const option = await product_price_1.ProductPriceOptionModel.findById(booking.option_id);
                    if (option) {
                        const price = await product_price_1.ProductPriceModel.findById(option.product_price_id);
                        if (price) {
                            price.quantity += 1;
                            await price.save();
                            console.log(`↩️ Restored quantity for product price ${price._id}`);
                        }
                    }
                }
                console.log(`❌ Booking ${booking._id} marked as failer and quantities restored`);
            }
        }
    }
    catch (err) {
        console.error("❌ Error checking bookings:", err);
    }
});
