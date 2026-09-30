import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { DeliveryManModel } from "../../models/schema/admin/deliveryMan";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";

// Create Delivery Man
export const createDeliveryMan = async (req: Request, res: Response) => {
  const { name, email, password, phone_number, status, photo } = req.body;

  if (!name || !email || !password || !phone_number) {
    throw new BadRequest("Name, email, password and phone number are required");
  }

  const existingEmail = await DeliveryManModel.findOne({ email });
  if (existingEmail) {
    throw new BadRequest("Delivery man with this email already exists");
  }

  const existingPhone = await DeliveryManModel.findOne({ phone_number });
  if (existingPhone) {
    throw new BadRequest("Delivery man with this phone number already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let photoUrl: string | undefined;
  if (photo) {
    photoUrl = await saveBase64Image(
      photo,
      Date.now().toString(),
      req,
      "delivery_men",
    );
  }

  const deliveryMan = await DeliveryManModel.create({
    name,
    email,
    password: hashedPassword,
    phone_number,
    status,
    photo: photoUrl,
  });

  const { password: _pw, ...deliveryManData } = deliveryMan.toObject();

  SuccessResponse(res, {
    message: "Delivery man created successfully",
    deliveryMan: deliveryManData,
  });
};

// Get All Delivery Men
export const getDeliveryMen = async (req: Request, res: Response) => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  const deliveryMen = await DeliveryManModel.find(filter)
    .select("-password")
    .sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Delivery men fetched successfully",
    deliveryMen,
  });
};

// Get Delivery Man By Id
export const getDeliveryManById = async (req: Request, res: Response) => {
  const deliveryMan = await DeliveryManModel.findById(req.params.id).select(
    "-password",
  );
  if (!deliveryMan) {
    throw new NotFound("Delivery man not found");
  }

  SuccessResponse(res, {
    message: "Delivery man fetched successfully",
    deliveryMan,
  });
};

// Update Delivery Man
export const updateDeliveryMan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: any = { ...req.body };

  if (updateData.email) {
    const existingEmail = await DeliveryManModel.findOne({
      email: updateData.email,
      _id: { $ne: id },
    });
    if (existingEmail) {
      throw new BadRequest("Delivery man with this email already exists");
    }
  }

  if (updateData.phone_number) {
    const existingPhone = await DeliveryManModel.findOne({
      phone_number: updateData.phone_number,
      _id: { $ne: id },
    });
    if (existingPhone) {
      throw new BadRequest(
        "Delivery man with this phone number already exists",
      );
    }
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  // لو اتبعتت صورة جديدة نحفظها، ولو مبعتتش نسيب القديمة زي ما هي
  if (updateData.photo) {
    updateData.photo = await saveBase64Image(
      updateData.photo,
      Date.now().toString(),
      req,
      "delivery_men",
    );
  } else {
    delete updateData.photo;
  }

  const deliveryMan = await DeliveryManModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!deliveryMan) {
    throw new NotFound("Delivery man not found");
  }

  SuccessResponse(res, {
    message: "Delivery man updated successfully",
    deliveryMan,
  });
};

// Delete Delivery Man
export const deleteDeliveryMan = async (req: Request, res: Response) => {
  const deliveryMan = await DeliveryManModel.findByIdAndDelete(req.params.id);
  if (!deliveryMan) {
    throw new NotFound("Delivery man not found");
  }

  SuccessResponse(res, {
    message: "Delivery man deleted successfully",
  });
};
