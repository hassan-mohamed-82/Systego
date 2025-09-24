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
import { saveBase64Image } from "../utils/handleImages"
import { RoleModel } from "../models/schema/roles";
import { ActionModel } from "../models/schema/Action";


export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequest("Email and password are required");
    }

    // ✅ نجيب المستخدم
    const user = await UserModel.findOne({ email })
      .populate("positionId")
      .lean<AppUser>();

    if (!user) {
      throw new NotFound("User not found");
    }

    // ✅ تحقق من كلمة السر
    const isMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // ✅ نجيب الـ roles المرتبطة بالـ position
    const roles = await RoleModel.find({ positionId: user.positionId?._id }).lean();

    // ✅ نجيب الـ actions المرتبطة بالـ roles
    let actions: any[] = [];
    if (roles && roles.length > 0) {
      actions = await ActionModel.find({ roleId: { $in: roles.map(r => r._id) } }).lean();
    }

    // 📌 Debugging logs (ممكن تشيلها بعد ما تتأكد)
    console.log("user.positionId:", user.positionId);
    console.log("roles:", roles);
    console.log("actions:", actions);

    // ✅ نولد التوكن
    const token = generateToken({
      _id: user._id,
      username: user.username,
      role: user.role,
      positionId: user.positionId?._id || null,
      roles: roles || [],
      actions: actions || [],
    });

    // ✅ نرجّع الاستجابة
    SuccessResponse(res, {
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        position: user.positionId || null,
        status: user.status,
        role: user.role,
        roles: roles?.map(r => r.name) || [],
        actions: actions?.map(a => a.name) || [],
      },
    });
  } catch (error) {
    next(error);
  }
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
  });

  // ✅ save image if exists
  if (data.imageBase64) {
    const imageUrl = await saveBase64Image(
      data.imageBase64,
      newUser._id.toString(),
      req,
      "users"
    );
    newUser.image_url = imageUrl;
    await newUser.save();
  }


  SuccessResponse(
    res,
    {
      message: "User Signup Successfully. Please login.",
      },
    201
  );
};
