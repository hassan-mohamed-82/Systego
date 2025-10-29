import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { CountryModel } from "../../models/schema/admin/Country";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const getCountries = async (req: Request, res: Response) => {
    const countries = await CountryModel.find();
    if (!countries || countries.length === 0) throw new NotFound("No countries found");
    SuccessResponse(res, { message: "get all countries successfully", countries });
}
export const getCountryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await CountryModel.findById(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "get country successfully", country });
}

export const createCountry = async (req: Request, res: Response) => {
  const { name, isDefault } = req.body;

  if (!name) throw new BadRequest("Country name is required");

  const existingCountry = await CountryModel.findOne({ name });
  if (existingCountry) throw new BadRequest("Country already exists");

  const hasDefaultCountry = await CountryModel.findOne({ isDefault: true });

  let country;

  // الحالة 1: أول دولة في النظام
  if (!hasDefaultCountry) {
    country = await CountryModel.create({ name, isDefault: true });
    return SuccessResponse(res, {
      message: "Country created as default (first country)",
      country,
    });
  }

  // الحالة 2: لو الدولة الجديدة default
  if (isDefault) {
    await CountryModel.updateMany({}, { $set: { isDefault: false } });
    country = await CountryModel.create({ name, isDefault: true });
  } 
  // الحالة 3: لو الدولة الجديدة مش default
  else {
    // لازم يكون فيه واحدة default بالفعل
    if (!hasDefaultCountry)
      throw new BadRequest("At least one country must be default");
    country = await CountryModel.create({ name, isDefault: false });
  }

  SuccessResponse(res, { message: "Country created successfully", country });
};


export const updateCountry = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Country id is required");

  const updateData: any = { ...req.body };

  const existingCountry = await CountryModel.findById(id);
  if (!existingCountry) throw new NotFound("Country not found");

  // الحالة 1️⃣: لو المستخدم بيخلي البلد دي Default
  if (updateData.isDefault === true) {
    // نلغي الـ default من أي بلد تانية
    await CountryModel.updateMany({}, { $set: { isDefault: false } });
    updateData.isDefault = true;
  }

  // الحالة 2️⃣: لو المستخدم بيشيل الـ default (بيخليها false)
  if (updateData.isDefault === false) {
    // نتحقق هل دي آخر default ولا لأ
    const hasOtherDefault = await CountryModel.findOne({
      _id: { $ne: id },
      isDefault: true,
    });

    // لو مفيش غيرها default → نمنع العملية
    if (!hasOtherDefault) {
      throw new BadRequest("At least one country must remain as default");
    }
  }

  const country = await CountryModel.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  SuccessResponse(res, { message: "Country updated successfully", country });
};


export const deleteCountry = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await CountryModel.findByIdAndDelete(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "delete country successfully", country });

};