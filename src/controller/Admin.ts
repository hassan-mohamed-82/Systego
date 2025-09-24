import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/schema/User";
import { BadRequest } from "../Errors/BadRequest";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { SuccessResponse } from "../utils/response";
import { saveBase64Image } from "../utils/handleImages";
import { NotFound } from "../Errors";

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const currentUser = req.user;

  const { username, email, password, positionId, company_name, phone, image_base64 } = req.body;

  if (!username || !email || !password || !positionId) {
    throw new BadRequest("Username, email, password, and positionId are required");
  }



  // ✅ التأكد من تكرار البيانات
  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new BadRequest("User with this email or username already exists");
  }

  // ✅ تشفير الباسورد
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // ✅ حفظ الصورة (اختياري)
  let image_url: string | undefined;
  if (image_base64) {
    image_url = await saveBase64Image(image_base64, username, req, "users");
  }

  // ✅ إنشاء المستخدم
  const newUser = await (await (UserModel.create({
      username,
      email,
      password_hash,
      positionId,
      company_name,
      phone,
      image_url,
  }))).populate("positionId");

  SuccessResponse(res, {
    message: "User created successfully",
    user: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      positionId: newUser.positionId,
      status: newUser.status,
      image_url: newUser.image_url,
    },
  });
};


export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {

  const users = await UserModel.find();

  if (!users || users.length === 0) {
    throw new NotFound("No users found");
  }

  SuccessResponse(res, { message: "get all users successfully", users });
}

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
 
  const { id } = req.params;

  if (!id) {
    throw new BadRequest("User id is required");
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, { message: "get user successfully", user });
}



export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
 

  const { id } = req.params;
  const { username, email, password, positionId, company_name, phone, status, image_base64 } = req.body;

  const user = await UserModel.findById(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (positionId) user.positionId = positionId;
  if (company_name) user.company_name = company_name;
  if (phone) user.phone = phone;
  if (status) user.status = status;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }

  if (image_base64) {
    user.image_url = await saveBase64Image(image_base64, user.username, req, "users");
  }

  await user.save();

  SuccessResponse(res, {
    message: "User updated successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      positionId: user.positionId,
      status: user.status,
      image_url: user.image_url,
    },
  });
};


export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {

  const { id } = req.params;

  if (!id) {
    throw new BadRequest("User id is required");
  }

  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, {
    message: "User deleted successfully",
  
  });
};