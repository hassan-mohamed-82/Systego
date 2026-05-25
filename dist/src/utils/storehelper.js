"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreInfo = void 0;
// src/utils/storeHelper.ts
const User_1 = require("../models/schema/admin/User");
const Warehouse_1 = require("../models/schema/admin/Warehouse");
const getStoreInfo = async (userId) => {
    const superAdmin = await User_1.UserModel.findOne({ role: "superadmin" })
        .select("company_name phone address warehouse_id")
        .lean();
    if (superAdmin?.company_name) {
        return {
            name: superAdmin.company_name,
            phone: superAdmin.phone || "",
            address: superAdmin.address || "",
        };
    }
    if (superAdmin?.warehouse_id) {
        const warehouse = await Warehouse_1.WarehouseModel.findById(superAdmin.warehouse_id)
            .select("name phone address")
            .lean();
        if (warehouse) {
            return {
                name: warehouse.name,
                phone: warehouse.phone || "",
                address: warehouse.address || "",
            };
        }
    }
    const user = await User_1.UserModel.findById(userId)
        .select("company_name phone address warehouse_id")
        .lean();
    if (user?.company_name) {
        return {
            name: user.company_name,
            phone: user.phone || "",
            address: user.address || "",
        };
    }
    if (user?.warehouse_id) {
        const warehouse = await Warehouse_1.WarehouseModel.findById(user.warehouse_id)
            .select("name phone address")
            .lean();
        if (warehouse) {
            return {
                name: warehouse.name,
                phone: warehouse.phone || "",
                address: warehouse.address || "",
            };
        }
    }
    return { name: "", phone: "", address: "" };
};
exports.getStoreInfo = getStoreInfo;
