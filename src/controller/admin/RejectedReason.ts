import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { RejectedReasonModel } from "../../models/schema/admin/RejectedReasons";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const createCity = async (req: Request, res: Response) => {
  const { name } = req.body; 
  const rejected_reasons = await RejectedReasonModel.create({ name });

  SuccessResponse(res, { message: "create rejected_reasons successfully", rejected_reasons });
}; 

// export const getCityById = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   if (!id) throw new BadRequest("City id is required");

//   const city = await CityModels.findById(id).populate("country");
//   if (!city) throw new NotFound("City not found");

//   SuccessResponse(res, { message: "get city successfully", city });
// };

// export const updateCity = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   if (!id) throw new BadRequest("City id is required");

//   const updateData: any = { ...req.body };

//   if (req.body.country) {
//     const countryExists = await CountryModel.findById(req.body.country);
//     if (!countryExists) throw new NotFound("Country not found");
//   }

//   const city = await CityModels.findByIdAndUpdate(id, updateData, { new: true }).populate("country");
//   if (!city) throw new NotFound("City not found");

//   SuccessResponse(res, { message: "update city successfully", city });
// };




// export const deleteCity = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   if (!id) throw new BadRequest("City id is required");

//   const city = await CityModels.findByIdAndDelete(id);
//   if (!city) throw new NotFound("City not found");

//   SuccessResponse(res, { message: "delete city successfully" });
// };


