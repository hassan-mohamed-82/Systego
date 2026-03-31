"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrderTypes = void 0;
const ordertype_1 = require("../models/schema/admin/ordertype");
const constant_1 = require("../types/constant");
const seedOrderTypes = async () => {
    try {
        for (const type of constant_1.ORDER_TYPES) {
            await ordertype_1.OrderTypeModel.findOneAndUpdate({ type }, { $setOnInsert: { type, isActive: true } }, { upsert: true, new: true });
        }
        console.log("✅ Order Types checked/seeded");
    }
    catch (err) {
        console.error("❌ Seed failed:", err);
    }
};
exports.seedOrderTypes = seedOrderTypes;
