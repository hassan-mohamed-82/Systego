import { Request, Response } from "express";
import { SupplierModel } from "../../models/schema/admin/suppliers";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { CityModels } from "../../models/schema/admin/City";
import { CountryModel } from "../../models/schema/admin/Country";

export const createSupplier = async (req: Request, res: Response) => {
  const {
    image,
    username,
    email,
    phone_number,
    address,
    cityId,
    countryId,
    company_name
    
  } = req.body;

  if (!username || !email || !phone_number|| !cityId || !countryId) {
    throw new BadRequest("Username, email, city, country, and phone number are required");
  }
  const existingSupplier = await SupplierModel.findOne({
    $or: [{ username }, { email }, { phone_number }],
  })
  if (existingSupplier) throw new BadRequest("Supplier with given username, email, or phone number already exists");

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "suppliers"
    );
  }

  const supplier = await SupplierModel.create({
    image: imageUrl,
    username,
    email,
    phone_number,
    address,
    cityId,
    countryId,
    company_name
  });

  SuccessResponse(res, { message: "Supplier created successfully", supplier });
};


export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await SupplierModel.find().populate("cityId").populate("countryId");
 
    const city= await CityModels.find();
    const country= await CountryModel.find();
  SuccessResponse(res, { message: "Suppliers retrieved successfully", suppliers, city, country });
};


export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findById(id)
    .populate("cityId")
    .populate("countryId");
    
  if (!supplier) throw new NotFound("Supplier not found");

  // جيب الـ Countries ومعاها الـ Cities
  const countries = await CountryModel.aggregate([
    {
      $lookup: {
        from: "cities",
        localField: "_id",
        foreignField: "country_id",
        as: "cities"
      }
    }
  ]);

  SuccessResponse(res, { 
    message: "Supplier retrieved successfully", 
    supplier, 
    countries 
  });
};



export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const updateData: any = { ...req.body };

  if (req.body.image) {
    updateData.image = await saveBase64Image(
      req.body.image,
      Date.now().toString(),
      req,
      "suppliers"
    );
  }

  const supplier = await SupplierModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier updated successfully", supplier });
};


export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findByIdAndDelete(id);
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier deleted successfully" });
};
