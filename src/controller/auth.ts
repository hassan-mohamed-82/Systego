import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/schema/User";
import { generateToken } from "../utils/auth";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../Errors";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "../utils/response";
import { AppUser } from "../types/custom";
import { sendEmail } from "../utils/sendEmails";
import { randomInt } from "crypto";

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


export const signup = async (req: Request, res: Response) => {
  const data = req.body;

  // ✅ check if user already exists
  const existingUser = await UserModel.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new ConflictError("Email is already registered");
    }
    if (existingUser.phone === data.phone) {
      throw new ConflictError("Phone Number is already used");
    }
  }

  // ✅ hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // ✅ create new user
  const newUser = await UserModel.create({
    username: data.username,
    email: data.email,
    password_hash: hashedPassword,
    phone: data.phone,
    company_name: data.company_name,
    role: data.role, // default = admin لو مش مبعوتة
    possitionId: data.possitionId,
    address: data.address,
    vat_number: data.vat_number,
    state: data.state,
    postal_code: data.postal_code,
    image_url: data.image_url,
  });

  SuccessResponse(
    res,
    {
      message: "User Signup Successfully. Please login.",
      userId: newUser._id,
    },
    201
  );
};