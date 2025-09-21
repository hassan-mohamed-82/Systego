import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/schema/User";
import { generateToken } from "../utils/auth";
import bcrypt from "bcryptjs";
import { UnauthorizedError } from "../Errors";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { Types } from "mongoose";
import { SuccessResponse } from "../utils/response";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequest("Email and password are required");
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new NotFound("User not found");
  }

  // التحقق من كلمة المرور باستخدام bcrypt مباشرة
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return next(new UnauthorizedError("Invalid email or password"));
  }

  const token = generateToken({
    id: user._id,
    role: user.role,
    name: user.username,
  });

SuccessResponse(res, {    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
};

