import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError, BadRequest } from "../../Errors";
import asyncHandler from 'express-async-handler';
import generateJWT from '../../middlewares/generateJWT';
import { saveBase64Image } from '../../utils/handleImages';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { sendEmail } from '../../utils/sendEmails';
import { CartModel } from "../../models/schema/users/Cart";
import mongoose from 'mongoose';

const generateOtpCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

// function to merge guest cart with user cart
const mergeCarts = async (userId: string, sessionId: string | undefined) => {
    if (!sessionId) return;

    const guestCart = await CartModel.findOne({ sessionId });
    const userCart = await CartModel.findOne({ user: userId });

    if (guestCart) {
        if (userCart) {
            // merge products from guest cart to user cart
            guestCart.cartItems.forEach(guestItem => {
                const existingItem = userCart.cartItems.find(
                    item => item.product.toString() === guestItem.product.toString()
                );

                if (existingItem) {
                    existingItem.quantity += guestItem.quantity;
                } else {
                    userCart.cartItems.push(guestItem);
                }
            });

            userCart.markModified('cartItems');
            await userCart.save();
            
            // delete guest cart after moving its contents
            await CartModel.deleteOne({ _id: guestCart._id });
        } else {
            // transfer ownership of guest cart to user directly
            guestCart.user = userId as any;
            guestCart.sessionId = undefined; // important to avoid index issues
            await guestCart.save();
        }
    }
};

// 1. Signup
export const signup = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, password, image } = req.body;

    const existing = await CustomerModel.findOne({ $or: [{ email }, { phone_number: phone }] });
    if (existing) {
        throw new BadRequest(existing.is_profile_complete
            ? "Customer already exists with this email or phone."
            : "You have an existing account from our store. Please login with your phone number to activate it.");
    }

    const newUser = new CustomerModel({ name, email, phone_number: phone, password });

    if (image) {
        newUser.imagePath = await saveBase64Image(image, newUser._id.toString(), req, 'profile_images');
    }

    await newUser.save();

    SuccessResponse(res, {
        message: "Signup successful, please login.",
        action_required: "GO_TO_LOGIN"
    }, 201);
});

// 2. Login (The Main Router for Frontend)
export const login = asyncHandler(async (req: Request, res: Response) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    if (!identifier) throw new BadRequest('Please provide email, phone or name');

    const user = await CustomerModel.findOne({
        $or: [{ email: identifier.toLowerCase() }, { phone_number: identifier }, { name: identifier }]
    }).select('+password');

  // Scenario 1: User doesn't exist at all
    if (!user) {
        throw new NotFound("Account not found.", {
           action_required: "GO_TO_SIGNUP" 
        });
    }

  // Scenario 2: POS Client (Account exists but no password yet)
    if (!user.is_profile_complete) {
        const otpCode = generateOtpCode();
        user.otp_code = otpCode;
        user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        if (user.email) {
            await sendEmail(user.email, 'Verification Code', `Your OTP code is ${otpCode}`);
        }

        return SuccessResponse(res, {
      message: 'Verification code sent to your contact info.',
            requires_otp: true,
            action_required: "GO_TO_OTP_SCREEN"
        }, 200);
    }

  // Scenario 3: Registered Online Client (Needs Password)
    if (!req.body.password) {
        return SuccessResponse(res, {
      message: "Please enter your password to continue.",
            action_required: "SHOW_PASSWORD_FIELD"
        }, 200);
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password || '');
    if (!isMatch) throw new BadRequest('Incorrect password.');

    // --- الدمج الذكي للسلة عند تسجيل الدخول ---
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    await mergeCarts(user.id, sessionId);

    const token = await generateJWT({ id: user.id });
    const { password, __v, ...userResponse } = user.toObject();

    return SuccessResponse(res, {
        message: 'Login successful',
        user: userResponse,
        token,
        action_required: "GO_TO_HOME"
    }, 200);
});

// 3. Verify OTP
export const verifyOtpAndLogin = asyncHandler(async (req: Request, res: Response) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const { otp } = req.body;

    const user = await CustomerModel.findOne({
        $or: [{ email: identifier }, { phone_number: identifier }, { name: identifier }]
    });

    if (!user || user.otp_code !== otp || (user.otp_expires_at && new Date() > user.otp_expires_at)) {
        throw new BadRequest('Invalid or expired OTP code.');
    }

    user.otp_code = undefined as any;
    user.otp_expires_at = undefined as any;
    await user.save();

    // If POS client, they MUST complete their profile (set password/name)
    if (!user.is_profile_complete) {
        return SuccessResponse(res, {
            message: 'OTP verified. Please set your account details.',
            action_required: "GO_TO_COMPLETE_PROFILE",
            user_data: {
                userId: user._id, 
                phone_number: user.phone_number, 
                email: user.email, 
                name: user.name,
                imagePath: user.imagePath,
                is_profile_complete: user.is_profile_complete,
            }
        }, 200);
    }

    // --- الدمج الذكي للسلة بعد التحقق من OTP ---
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    await mergeCarts(user.id, sessionId);

    const token = await generateJWT({ id: user.id });
    const { password, __v, ...userResponse } = user.toObject();
    return SuccessResponse(res, {
        message: 'Verified successfully', 
        token, 
        user: userResponse, 
        action_required: "GO_TO_HOME" 
    }, 200);
});

// 4. Complete Profile (The bridge from POS to Online)
export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId, name, email, password, confirmPassword, image } = req.body;

    if (password !== confirmPassword) {
      throw new BadRequest('Passwords do not match.');
    }

    const user = await CustomerModel.findById(userId);
    if (!user) throw new NotFound("User not found.");

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;

    if (image) {
        user.imagePath = await saveBase64Image(image, user._id.toString(), req, 'profile_images');
    }

    await user.save();

    // --- الدمج الذكي للسلة بعد إكمال البروفايل ---
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    await mergeCarts(user.id, sessionId);

    const token = await generateJWT({ id: user.id });
    const { password: _, __v, ...userResponse } = user.toObject();

    return SuccessResponse(res, {
    message: "Account activated successfully!",
        token, 
        user: userResponse, 
        action_required: "GO_TO_HOME" 
    }, 200);
});

// 5. Edit Profile
export const editProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await CustomerModel.findById(req.params.id);
    if (!user) throw new NotFound('User not found.');
    if (user.id !== req.user?.id) throw new UnauthorizedError('Not authorized.');

    const { phone, name, email, password, image } = req.body;

    if (image) {
        user.imagePath = await saveBase64Image(image, user.id, req, 'profile_images');
    }
    if (phone) user.phone_number = phone;
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;

    await user.save();
    return SuccessResponse(res, {
        message: 'Profile updated successfully', 
        action_required: "REFRESH_PROFILE" 
    }, 200);
});

// 6. Get Profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await CustomerModel.findById(req.user?.id);
    if (!user) throw new NotFound('User not found.');
    const { password, __v, ...userResponse } = user.toObject();
    return SuccessResponse(res, { message: 'Profile retrieved successfully', data: userResponse }, 200);
});

// 7. Resend OTP
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const user = await CustomerModel.findOne({ $or: [{ email: identifier }, { phone_number: identifier }] });
    if (!user) throw new NotFound('User not found.');

    const otpCode = generateOtpCode();
    user.otp_code = otpCode;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    if (user.email) await sendEmail(user.email, 'Your OTP Code', `Your new code is ${otpCode}`);

    return SuccessResponse(res, {
    message: 'A new OTP has been sent.',
    requires_otp: true, 
    action_required: "STAY_ON_OTP_SCREEN" 
    }, 200);
});