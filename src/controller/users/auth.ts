import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SuccessResponse } from "../../utils/response";
import {
  NotFound,
  UnauthorizedError,
  UniqueConstrainError,
} from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import asyncHandler from 'express-async-handler';
import generateJWT from '../../middlewares/generateJWT';
import { saveBase64Image } from '../../utils/handleImages';
import { CustomerModel } from '../../models/schema/users/Customer';
import { sendEmail } from '../../utils/sendEmails';

const generateOtpCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();


export const signup = async (req: Request, res: Response) => {
  const { name, username, email, phone, password } = req.body;

  const existing = await CustomerModel.findOne({ email });
  if (existing) throw new UniqueConstrainError("Email", "User already signed up with this email");

  const existingUsername = await CustomerModel.findOne({ username });
  if (existingUsername) throw new UniqueConstrainError("Username", "User already signed up with this username");

  const userData: any = {
    name,
    username,
    email,
    phone_number: phone,
    password
  };

  const newUser = new CustomerModel(userData);

  await newUser.save();

  SuccessResponse(res, { message: "Signup successful" }, 201);
};


export const login = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier ?? req.body.email;
  const user = await CustomerModel.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) {
    throw new BadRequest('Incorrect email/username or password');
  }

  if (!user.is_profile_complete) {
    if (!user.email) {
      throw new BadRequest('Email is required to receive OTP');
    }

    const otpCode = generateOtpCode();
    user.otp_code = otpCode;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(
      user.email,
      'Your OTP Code',
      `Your OTP code is ${otpCode}. It will expire in 10 minutes.`
    );

    return SuccessResponse(res, {
      message: 'OTP sent to your email',
      requires_otp: true,
    }, 200);
  }

  if (!req.body.password) {
    throw new BadRequest('Password is required');
  }

  if (!user.password || !(await bcrypt.compare(req.body.password, user.password))) {
    throw new BadRequest('Incorrect email/username or password');
  }

  const { password, __v, ...userResponse } = user.toObject();

  const token = await generateJWT({ id: user.id });

  return SuccessResponse(res, {
    message: 'User logged in successfully',
    user: userResponse,
    token
  }, 200);
});

export const verifyOtpAndLogin = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier ?? req.body.email;
  const { otp } = req.body;

  const user = await CustomerModel.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) {
    throw new NotFound('User not found');
  }

  if (!user.otp_code || !user.otp_expires_at) {
    throw new BadRequest('No OTP found for this user');
  }

  if (user.otp_code !== otp) {
    throw new BadRequest('Invalid OTP');
  }

  if (new Date() > user.otp_expires_at) {
    throw new BadRequest('OTP expired');
  }

  user.otp_code = undefined as any;
  user.otp_expires_at = undefined as any;
  await user.save();

  const token = await generateJWT({ id: user.id });
  const { password, __v, otp_code, otp_expires_at, ...userResponse } = user.toObject();

  return SuccessResponse(res, {
    message: 'OTP verified successfully',
    token,
    user: userResponse,
    requires_otp: false,
  }, 200);
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier ?? req.body.email;

  const user = await CustomerModel.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) {
    throw new NotFound('User not found');
  }

  if (user.is_profile_complete) {
    throw new BadRequest('User profile is already complete and does not require OTP');
  }

  if (!user.email) {
    throw new BadRequest('Email is required to receive OTP');
  }

  const otpCode = generateOtpCode();
  user.otp_code = otpCode;
  user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail(
    user.email,
    'Your OTP Code',
    `Your OTP code is ${otpCode}. It will expire in 10 minutes.`
  );

  return SuccessResponse(res, {
    message: 'OTP resent successfully',
    requires_otp: true,
  }, 200);
});

export const editProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await CustomerModel.findById(req.params.id);

  if (!user) {
    throw new NotFound('User not found');
  }
  if (user.id !== req.user?.id) {
    throw new UnauthorizedError('You are not authorized to edit this profile');
  }

  const { name, phone, username, email, password } = req.body;

  const folder = 'profile_images';

  const imageUrl = req.user?.id ? await saveBase64Image(req.body.image, req.user.id, req, folder) : null;
  if (imageUrl) user.imagePath = imageUrl;
  if (name) user.name = name;
  if (phone) user.phone_number = phone;
  if (username && username !== user.username) {
    const existingUsername = await CustomerModel.findOne({ username, _id: { $ne: user.id } });
    if (existingUsername) throw new UniqueConstrainError('Username', 'Username already exists');
    user.username = username;
  }
  if (email && email !== user.email) {
    const existingEmail = await CustomerModel.findOne({ email, _id: { $ne: user.id } });
    if (existingEmail) throw new UniqueConstrainError('Email', 'Email already exists');
    user.email = email;
  }
  if (password) user.password = password;


  await user.save();
  return SuccessResponse(res, {
    message: 'Profile updated successfully',
    is_profile_complete: user.is_profile_complete,
    requires_otp: !user.is_profile_complete,
  }, 200);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await CustomerModel.findById(req.user?.id).select('-password -__v')
  if (!user) {
    throw new NotFound('User not found');
  }
  return SuccessResponse(res, {
    message: 'Profile retrieved successfully',
    data: user,
    is_profile_complete: user.is_profile_complete,
    requires_otp: !user.is_profile_complete,
  }, 200);
});






