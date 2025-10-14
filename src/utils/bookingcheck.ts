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

      if (diffDays >= booking.number_of_days) {
        // ✅ Update booking status to failer
        booking.status = "failer";
        await booking.save();

        // ✅ Return product quantity
        if (booking.ProductId && booking.ProductId.length > 0) {
          const product = await ProductModel.findById(booking.ProductId[0]);
          if (product) {
            product.quantity += 1;
            await product.save();
            console.log(`↩️ Restored quantity for product ${product._id}`);
          }
        }

        // ✅ Return product price quantity if exists
        if ((booking as any).option_id) {
          const option = await ProductPriceOptionModel.findById((booking as any).option_id);
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
