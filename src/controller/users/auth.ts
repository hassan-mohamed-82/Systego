import { Request, Response } from "express";
import { saveBase64Image } from "../../utils/handleImages";
import { EmailVerificationModel} from "../../models/shema/auth/emailVerifications";
import {  UserModel } from "../../models/shema/auth/User";
import bcrypt from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { randomInt } from "crypto";
import {
  ForbiddenError,
  NotFound,
  UnauthorizedError,
  UniqueConstrainError,
} from "../../Errors";
import { generateToken } from "../../utils/auth";
import { sendEmail } from "../../utils/sendEmails";
import { BadRequest } from "../../Errors/BadRequest";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../../types/custom";


export const signup = async (req: Request, res: Response) => {
  const { name, email, password, BaseImage64,  } = req.body;

  // التحقق من وجود المستخدم مسبقًا
  const existing = await UserModel.findOne({ email });
  if (existing) throw new UniqueConstrainError("Email", "User already signed up with this email");

  // تشفير الباسورد
  const hashedPassword = await bcrypt.hash(password, 10);

  // إعداد البيانات العامة للمستخدم
  const userData: any = {
    name,
    email,
    password: hashedPassword,
    BaseImage64: BaseImage64 || null,
    isVerified: false,
  };

  // إنشاء الـ User أولًا
  const newUser = new UserModel(userData);
  await newUser.save();

 
  // إنشاء كود التحقق
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await new EmailVerificationModel({
    userId: newUser._id,
    verificationCode: code,
    expiresAt,
  }).save();

  // إرسال الإيميل بعد التأكد من حفظ كل البيانات
  await sendEmail(
    email,
    "Verify Your Email",
    `Hello ${name},

We received a request to verify your Smart College account.
Your verification code is: ${code}
(This code is valid for 2 hours only)

Best regards,
Smart College Team`
  );

  SuccessResponse(res, { message: "Signup successful, check your email for code", userId: newUser._id }, 201);
};



export const verifyEmail = async (req: Request, res: Response) => {
  const { userId, code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ success: false, error: { code: 400, message: "userId and code are required" } });
  }

  const record = await EmailVerificationModel.findOne({ userId });
  if (!record) {
    return res.status(400).json({ success: false, error: { code: 400, message: "No verification record found" } });
  }

  if (record.verificationCode !== code) {
    return res.status(400).json({ success: false, error: { code: 400, message: "Invalid verification code" } });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ success: false, error: { code: 400, message: "Verification code expired" } });
  }

  // تحديث المستخدم مباشرة بدون save()
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { isVerified: true },
    { new: true } // يرجع النسخة المحدثة
  );

  // حذف سجل التحقق
  await EmailVerificationModel.deleteOne({ userId });

  res.json({ success: true, message: "Email verified successfully"});
};



export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!password) {
    throw new UnauthorizedError("Password is required");
  }

  const user = await UserModel.findOne({ email });
  if (!user || !user.password) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  
  if (!user.isVerified) {
    throw new ForbiddenError("Verify your email first");
  }

  const token = generateToken({
  id: user._id.toString(),
    name: user.name,

  });

  SuccessResponse(res, { message: "Login Successful", token }, 200);
};


export const getFcmToken = async (req: AuthenticatedRequest, res: Response) => {

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId: Types.ObjectId = new Types.ObjectId(req.user.id);

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.fcmtoken = req.body.token;
  await user.save();

  SuccessResponse(res, { message: "FCM token updated successfully" }, 200);
};




export const sendResetCode = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFound("User not found");
  if (!user.isVerified) throw new BadRequest("User is not verified");

  const code = randomInt(100000, 999999).toString();

  // حذف أي كود موجود مسبقًا
  await EmailVerificationModel.deleteMany({ userId: user._id });

  // إنشاء كود جديد
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // ساعتين
  await EmailVerificationModel.create({
    userId: user._id,
    verificationCode: code,
    expiresAt,
  });

  await sendEmail(
    email,
    "Reset Password Code",
    `Hello ${user.name},

Your password reset code is: ${code}
(This code is valid for 2 hours)

Best regards,
Smart College Team`
  );

  SuccessResponse(res, { message: "Reset code sent to your email" }, 200);
};

// 2️⃣ التحقق من الكود
export const verifyResetCode = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  // ✅ 1. دور على اليوزر
  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFound("User not found");

  const userId = user._id;
  // ✅ 2. دور على الكود باستخدام user._id
  const record = await EmailVerificationModel.findOne({ userId});
  if (!record) throw new BadRequest("No reset code found");

  // ✅ 3. تحقق من الكود
  if (record.verificationCode !== code) throw new BadRequest("Invalid code");

  // ✅ 4. تحقق من الصلاحية
  if (record.expiresAt < new Date()) throw new BadRequest("Code expired");


  // ✅ 5. رجّع رد النجاح
  SuccessResponse(res, { message: "Reset code verified successfully" }, 200);
};

// 3️⃣ إعادة تعيين كلمة المرور
export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFound("User not found");

  const record = await EmailVerificationModel.findOne({ userId: user._id });
  if (!record) throw new BadRequest("No reset code found");
  if (record.verificationCode !== code) throw new BadRequest("Invalid code");
  if (record.expiresAt < new Date()) throw new BadRequest("Code expired");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await EmailVerificationModel.deleteOne({ userId: user._id });

  SuccessResponse(res, { message: "Password reset successful" }, 200);
};





