"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDecimalSetting = exports.getDecimalSetting = void 0;
const DecimalSetting_1 = require("../../models/schema/admin/DecimalSetting");
const response_1 = require("../../utils/response");
// GET — returns the current decimal setting (creates default if none exists)
const getDecimalSetting = async (req, res) => {
    let setting = await DecimalSetting_1.DecimalSettingModel.findOne();
    if (!setting) {
        setting = await DecimalSetting_1.DecimalSettingModel.create({ decimal_places: 2 });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Decimal setting retrieved successfully",
        setting,
    });
};
exports.getDecimalSetting = getDecimalSetting;
// PUT — update the decimal places value
const updateDecimalSetting = async (req, res) => {
    const { decimal_places } = req.body;
    let setting = await DecimalSetting_1.DecimalSettingModel.findOne();
    if (!setting) {
        setting = await DecimalSetting_1.DecimalSettingModel.create({ decimal_places });
    }
    else {
        setting.decimal_places = decimal_places;
        await setting.save();
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Decimal setting updated successfully",
        setting,
    });
};
exports.updateDecimalSetting = updateDecimalSetting;
