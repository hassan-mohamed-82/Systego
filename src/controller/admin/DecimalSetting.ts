import { Request, Response } from "express";
import { DecimalSettingModel } from "../../models/schema/admin/DecimalSetting";
import { SuccessResponse } from "../../utils/response";

// GET — returns the current decimal setting (creates default if none exists)
export const getDecimalSetting = async (req: Request, res: Response) => {
  let setting = await DecimalSettingModel.findOne();

  if (!setting) {
    setting = await DecimalSettingModel.create({ decimal_places: 2 });
  }

  SuccessResponse(res, {
    message: "Decimal setting retrieved successfully",
    setting,
  });
};

// PUT — update the decimal places value
export const updateDecimalSetting = async (req: Request, res: Response) => {
  const { decimal_places } = req.body;

  let setting = await DecimalSettingModel.findOne();

  if (!setting) {
    setting = await DecimalSettingModel.create({ decimal_places });
  } else {
    setting.decimal_places = decimal_places;
    await setting.save();
  }

  SuccessResponse(res, {
    message: "Decimal setting updated successfully",
    setting,
  });
};
