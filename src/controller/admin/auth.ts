import { Request, Response, NextFunction } from "express";
import { UserModel } from "../../models/schema/admin/User";
import { generateToken } from "../../utils/auth";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";
import { AppUser, UserPermission } from "../../types/custom";
import { sendEmail } from "../../utils/sendEmails";
import { randomInt } from "crypto";
import { saveBase64Image } from "../../utils/handleImages"
import { RoleModel } from "../../models/schema/admin/roles";
import { ActionModel } from "../../models/schema/admin/Action";


export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequest("Email and password are required");
  }

  const user = await UserModel.findOne({ email }).lean<AppUser>();

  if (!user) {
    throw new NotFound("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash as string);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // تحويل permissions لشكل مرتب
  const mappedPermissions: UserPermission[] =
    (user.permissions || []).map((p) => ({
      module: p.module,
      actions: (p.actions || []).map((a) => ({
        id: a._id.toString(),
        action: a.action,
      })),
    }));

  // ✅ استخدم warehouse_id من الداتا
  const token = generateToken({
    _id: user._id!,
    username: user.username,
    role: user.role,
    warehouse_id: (user as any).warehouse_id || null,
    permissions: mappedPermissions,
  });

  SuccessResponse(res, {
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      status: user.status,
      role: user.role,
      warehouse_id: (user as any).warehouse_id
        ? (user as any).warehouse_id.toString()
        : null,
      permissions: mappedPermissions,
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
