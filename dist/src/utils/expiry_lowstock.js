"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.startCron = startCron;
const products_1 = require("../models/schema/admin/products");
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
        if (product.low_stock && product.quantity <= product.low_stock) {
            const notification = await Notfication_1.NotificationModel.create({
                type: "low_stock",
                productId: product._id,
                message: `⚠️ Product ${product.name} is low in stock (${product.quantity}).`,
            });
            this.io.emit("notification", notification);
        }
    }
    async checkExpiry() {
        const now = new Date();
        const soon = new Date();
        soon.setDate(now.getDate() + 7); // قرب يخلص بعد 7 أيام
        const products = await products_1.ProductModel.find({
            date_of_expiery: { $lte: soon, $gte: now },
        });
        for (const product of products) {
            const notification = await Notfication_1.NotificationModel.create({
                type: "expiry",
                productId: product._id,
                message: `⏰ Product ${product.name} will expire on ${product.date_of_expiery?.toDateString()}.`,
            });
            this.io.emit("notification", notification);
        }
    }
}
exports.NotificationService = NotificationService;
// cron-jobs.ts
function startCron(io) {
    const service = new NotificationService(io);
    // يتشيك كل يوم الساعة 12 بليل
    node_cron_1.default.schedule("0 15 * * *", async () => {
        await service.checkExpiry();
    });
}
