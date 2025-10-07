"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCity = void 0;
const response_1 = require("../../utils/response");
const RejectedReasons_1 = require("../../models/schema/admin/RejectedReasons");
const createCity = async (req, res) => {
    const { name } = req.body;
    const rejected_reasons = await RejectedReasons_1.RejectedReasonModel.create({ name });
    (0, response_1.SuccessResponse)(res, { message: "create rejected_reasons successfully", rejected_reasons });
};
exports.createCity = createCity;
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
