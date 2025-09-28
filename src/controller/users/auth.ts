import { Request, Response } from "express";
import {  Platform_User } from "../../models/schema/users/platformUser";
import bcrypt from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import {
  ForbiddenError,
  NotFound,
  UnauthorizedError,
  UniqueConstrainError,
} from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";

import asyncHandler from 'express-async-handler';

import  generateJWT   from '../../middlewares/generateJWT';

import { saveBase64Image } from '../../utils/handleImages';


export const signup = async (req: Request, res: Response) => {
  const { name, email, phone, password  } = req.body;

  const existing = await Platform_User.findOne({ email });
  if (existing) throw new UniqueConstrainError("Email", "User already signed up with this email");

  const userData: any = {
    name,
    email,
    phone_number: phone,
    password
  };

  const newUser = new Platform_User(userData);

  await newUser.save();

  SuccessResponse(res, { message: "Signup successful"}, 201);
};


export const login = asyncHandler(async (req: Request , res: Response) => {
  const user = await Platform_User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    throw new BadRequest('Incorrect email or password');
  }

 const token = await generateJWT({id: user.id});

  return SuccessResponse(res, { message: 'User logged in successfully', token}, 200);
});


export const editProfile = asyncHandler(async (req: Request , res: Response) => {
  const user = await Platform_User.findById(req.params.id);

  if (!user) {
    throw new NotFound('User not found');
  }
  if (user.id !== req.user?.id) {
    throw new UnauthorizedError('You are not authorized to edit this profile');
  }

  const { name, phone } = req.body;

   const folder = 'profile_images';

const imageUrl = req.user?.id ? await saveBase64Image(req.body.image, req.user.id, req, folder) : null;  
  if (imageUrl) user.imagePath = imageUrl;
  if (name) user.name = name;
  if (phone) user.phone_number = phone;


  await user.save();
  return SuccessResponse(res, { message: 'Profile updated successfully'}, 200);
});

// getProfiel user

export const getProfile = asyncHandler(async (req: Request , res: Response) => {
  const user = await Platform_User.findById(req.user?.id).select('-password -v')
  if (!user) {
    throw new NotFound('User not found');
  }
  return SuccessResponse(res, { message: 'Profile retrieved successfully', data: user}, 200);
});






