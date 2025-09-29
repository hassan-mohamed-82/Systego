import { Request, Response } from "express";
import { SupplierModel } from "../../models/schema/admin/suppliers";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";


// 🟢 Create Supplier
export const createSupplier = async (req: Request, res: Response) => {
  const {
    image,
    username,
    email,
    phone_number,
    vat_number,
    address,
    state,
    postal_code,
    total_due,
  } = req.body;

  if (!username || !email || !phone_number) {
    throw new BadRequest("Username, email, and phone number are required");
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
    vat_number,
    address,
    state,
    postal_code,
    total_due,
  });

  SuccessResponse(res, { message: "Supplier created successfully", supplier });
};


// 🟡 Get All Suppliers
export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await SupplierModel.find({});
  if (!suppliers || suppliers.length === 0) {
    throw new NotFound("No suppliers found");
  }
  SuccessResponse(res, { message: "Suppliers retrieved successfully", suppliers });
};


// 🔵 Get Supplier By ID
export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findById(id);
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier retrieved successfully", supplier });
};


// 🟠 Update Supplier
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


// 🔴 Delete Supplier
export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findByIdAndDelete(id);
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier deleted successfully" });
};
