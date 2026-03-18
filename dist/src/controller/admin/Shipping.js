"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFreeShippingProducts = exports.getFreeShippingProducts = exports.updateShippingSettings = exports.getShippingSettings = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const Couriers_1 = require("../../models/schema/admin/Couriers");
const products_1 = require("../../models/schema/admin/products");
const DEFAULT_FILTER = { singletonKey: "default" };
const ensureSettings = async () => {
    let settings = await ShippingSettings_1.ShippingSettingsModel.findOne(DEFAULT_FILTER);
    if (!settings) {
        settings = await ShippingSettings_1.ShippingSettingsModel.create(DEFAULT_FILTER);
    }
    return settings;
};
const getShippingSettings = async (_req, res) => {
    const settings = await ensureSettings();
    (0, response_1.SuccessResponse)(res, {
        message: "Shipping settings fetched successfully",
        settings,
    });
};
exports.getShippingSettings = getShippingSettings;
const updateShippingSettings = async (req, res) => {
    const { shippingMethod, flatRate, carrierRate, carrierId, freeShippingEnabled, } = req.body;
    if (shippingMethod === "flat_rate" && (flatRate === undefined || flatRate === null)) {
        throw new BadRequest_1.BadRequest("flatRate is required when shipping method is flat_rate");
    }
    if (shippingMethod === "carrier" && (carrierRate === undefined || carrierRate === null)) {
        throw new BadRequest_1.BadRequest("carrierRate is required when shipping method is carrier");
    }
    if (carrierId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(carrierId)) {
            throw new BadRequest_1.BadRequest("Invalid carrierId");
        }
        const courier = await Couriers_1.CourierModel.findById(carrierId);
        if (!courier) {
            throw new BadRequest_1.BadRequest("Courier not found");
        }
    }
    const settings = await ensureSettings();
    settings.shippingMethod = shippingMethod;
    if (shippingMethod === "zone") {
        settings.flatRate = 0;
        settings.carrierRate = 0;
        settings.set("carrierId", undefined);
    }
    if (shippingMethod === "flat_rate") {
        settings.flatRate = Number(flatRate);
        settings.carrierRate = 0;
        settings.set("carrierId", undefined);
    }
    if (shippingMethod === "carrier") {
        settings.carrierRate = Number(carrierRate);
        settings.set("carrierId", carrierId ?? undefined);
        settings.flatRate = 0;
    }
    if (freeShippingEnabled !== undefined) {
        settings.freeShippingEnabled = freeShippingEnabled;
    }
    await settings.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Shipping settings updated successfully",
        settings,
    });
};
exports.updateShippingSettings = updateShippingSettings;
const getFreeShippingProducts = async (_req, res) => {
    const products = await products_1.ProductModel.find({ free_shipping: true }, { name: 1, ar_name: 1, code: 1, free_shipping: 1 }).sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Free shipping products fetched successfully",
        count: products.length,
        products,
    });
};
exports.getFreeShippingProducts = getFreeShippingProducts;
const updateFreeShippingProducts = async (req, res) => {
    const { productIds } = req.body;
    const uniqueProductIds = Array.from(new Set(productIds || []));
    for (const id of uniqueProductIds) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new BadRequest_1.BadRequest(`Invalid product id: ${id}`);
        }
    }
    const existingProductsCount = await products_1.ProductModel.countDocuments({
        _id: { $in: uniqueProductIds },
    });
    if (existingProductsCount !== uniqueProductIds.length) {
        throw new BadRequest_1.BadRequest("One or more products were not found");
    }
    await products_1.ProductModel.updateMany({}, { $set: { free_shipping: false } });
    if (uniqueProductIds.length > 0) {
        await products_1.ProductModel.updateMany({ _id: { $in: uniqueProductIds } }, { $set: { free_shipping: true } });
    }
    const products = await products_1.ProductModel.find({ free_shipping: true }, { name: 1, ar_name: 1, code: 1, free_shipping: 1 }).sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Free shipping products updated successfully",
        count: products.length,
        products,
    });
};
exports.updateFreeShippingProducts = updateFreeShippingProducts;
