"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.startCron = startCron;
const products_1 = require("../models/schema/admin/products");
const purchase_item_1 = require("../models/schema/admin/purchase_item");
const Notfication_1 = require("../models/schema/admin/Notfication");
const node_cron_1 = __importDefault(require("node-cron"));
class NotificationService {
    constructor(io) {
        this.io = io;
    }
    async checkLowStock(productId) {
        const product = await products_1.ProductModel.findById(productId);
        if (!product)
            return;
        const qty = product.quantity ?? 0;
        if (product.low_stock && qty <= product.low_stock) {
            const existingNotification = await Notfication_1.NotificationModel.findOne({
                type: "low_stock",
                productId: product._id,
                isRead: false,
            });
            if (existingNotification)
                return;
            const notification = await Notfication_1.NotificationModel.create({
                type: "low_stock",
                productId: product._id,
                message: `⚠️ Product ${product.name} is low in stock (${qty}).`,
            });
            this.io.emit("notification", notification);
        }
    }
    async checkExpiry() {
        const now = new Date();
        const soon = new Date();
        soon.setDate(now.getDate() + 7);
        now.setHours(0, 0, 0, 0);
        soon.setHours(23, 59, 59, 999);
        const expiringItems = await purchase_item_1.PurchaseItemModel.find({
            item_type: "product",
            date_of_expiery: { $lte: soon, $gte: now },
            quantity: { $gt: 0 },
        }).populate({
            path: "product_id",
            select: "_id name",
        });
        for (const item of expiringItems) {
            const product = item.product_id;
            if (!product)
                continue;
            const existingNotification = await Notfication_1.NotificationModel.findOne({
                type: "expiry",
                purchaseItemId: item._id,
                isRead: false,
            });
            if (existingNotification)
                continue;
            const expiryDate = item.date_of_expiery?.toDateString() || "Unknown";
            const notification = await Notfication_1.NotificationModel.create({
                type: "expiry",
                productId: product._id,
                purchaseItemId: item._id,
                message: `⏰ Product ${product.name} will expire on ${expiryDate}. Quantity: ${item.quantity}`,
            });
            this.io.emit("notification", notification);
        }
    }
    async checkExpired() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiredItems = await purchase_item_1.PurchaseItemModel.find({
            item_type: "product",
            date_of_expiery: { $lt: now },
            quantity: { $gt: 0 },
        }).populate({
            path: "product_id",
            select: "_id name",
        });
        for (const item of expiredItems) {
            const product = item.product_id;
            if (!product)
                continue;
            const existingNotification = await Notfication_1.NotificationModel.findOne({
                type: "expired",
                purchaseItemId: item._id,
                isRead: false,
            });
            if (existingNotification)
                continue;
            const expiryDate = item.date_of_expiery?.toDateString() || "Unknown";
            const notification = await Notfication_1.NotificationModel.create({
                type: "expired",
                productId: product._id,
                purchaseItemId: item._id,
                message: `🚨 Product ${product.name} has EXPIRED on ${expiryDate}. Quantity: ${item.quantity}`,
            });
            this.io.emit("notification", notification);
        }
    }
    async checkAllLowStock() {
        const products = await products_1.ProductModel.find({
            low_stock: { $exists: true, $ne: null },
        });
        for (const product of products) {
            const qty = product.quantity ?? 0;
            if (product.low_stock && qty <= product.low_stock) {
                const existingNotification = await Notfication_1.NotificationModel.findOne({
                    type: "low_stock",
                    productId: product._id,
                    isRead: false,
                });
                if (existingNotification)
                    continue;
                const notification = await Notfication_1.NotificationModel.create({
                    type: "low_stock",
                    productId: product._id,
                    message: `⚠️ Product ${product.name} is low in stock (${qty}).`,
                });
                this.io.emit("notification", notification);
            }
        }
    }
}
exports.NotificationService = NotificationService;
function startCron(io) {
    const service = new NotificationService(io);
    // يتشيك كل يوم الساعة 3 العصر على المنتجات القريبة من الانتهاء
    node_cron_1.default.schedule("0 15 * * *", async () => {
        console.log("🔔 Running expiry check...");
        await service.checkExpiry();
    });
    // يتشيك كل يوم الساعة 3:30 على المنتجات المنتهية فعلاً
    node_cron_1.default.schedule("30 15 * * *", async () => {
        console.log("🚨 Running expired check...");
        await service.checkExpired();
    });
    // يتشيك كل يوم الساعة 4 على المنتجات اللي كميتها قليلة
    node_cron_1.default.schedule("0 16 * * *", async () => {
        console.log("⚠️ Running low stock check...");
        await service.checkAllLowStock();
    });
    console.log("✅ Cron jobs scheduled successfully");
}
