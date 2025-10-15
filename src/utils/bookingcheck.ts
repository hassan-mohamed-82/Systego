import cron from "node-cron";
import { BookingModel } from "../models/schema/admin/Booking";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/schema/admin/product_price";

cron.schedule("0 * * * *", async () => {
  try {
    console.log("⏰ Checking pending bookings...");
    const now = new Date();

    const pendingBookings = await BookingModel.find({ status: "pending" });

    for (const booking of pendingBookings) {
      if (!booking.createdAt) continue;

      const createdAt = new Date(booking.createdAt);
      const diffDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // ✅ Check if booking exceeded its allowed days
      if (diffDays >= booking.number_of_days) {
        booking.status = "failer";
        await booking.save();

        // ✅ Restore product quantity (if exists)
        if (booking.ProductId) {
          const product = await ProductModel.findById(booking.ProductId);
          if (product) {
            product.quantity += 1;
            await product.save();
            console.log(`↩️ Restored quantity for product ${product._id}`);
          }
        }

        // ✅ Restore product price quantity (if exists)
        if (booking.option_id) {
          const option = await ProductPriceOptionModel.findById(booking.option_id);
          if (option) {
            const price = await ProductPriceModel.findById(option.product_price_id);
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
  } catch (err) {
    console.error("❌ Error checking bookings:", err);
  }
});
