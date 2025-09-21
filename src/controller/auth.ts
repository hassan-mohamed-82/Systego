import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/schema/User";
import { generateToken } from "../utils/auth";
import bcrypt from "bcryptjs";
import { UnauthorizedError } from "../Errors";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";
import { AppUser } from "../types/custom";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequest("Email and password are required");
  }

  // ✅ نجيب اليوزر + position + roles + actions
  const user = await UserModel.findOne({ email })
    .populate({
      path: "possitionid",
      model: "Position",
      populate: {
        path: "roles",
        model: "Role",
        populate: {
          path: "actions",
          model: "Action",
        },
      },
    })
    .lean<AppUser>(); // 👈 يخلي النتيجة تاخد شكل AppUser

  if (!user) {
    throw new NotFound("User not found");
  }

  // ✅ التحقق من كلمة المرور
  const isMatch = await bcrypt.compare(password, user.password_hash as string);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // ✅ توليد التوكن
  const token = generateToken({
    id: user._id,
    position: (user.positionId as any)?.name, // نرجع اسم الـ Position
    name: user.username,
  });

  // ✅ استجابة منظمة
  SuccessResponse(res, {
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      position: user.positionId, // فيه جواه الـ roles + actions
      status: user.status,
    },
  });
};
