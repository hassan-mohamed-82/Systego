"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtp = exports.getProfile = exports.editProfile = exports.completeProfile = exports.verifyOtpAndLogin = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const generateJWT_1 = __importDefault(require("../../middlewares/generateJWT"));
const handleImages_1 = require("../../utils/handleImages");
const customer_1 = require("../../models/schema/admin/POS/customer");
const sendEmails_1 = require("../../utils/sendEmails");
const Cart_1 = require("../../models/schema/users/Cart");
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();
// function to merge guest cart with user cart
const mergeCarts = async (userId, sessionId) => {
    if (!sessionId)
        return;
    const guestCart = await Cart_1.CartModel.findOne({ sessionId });
    const userCart = await Cart_1.CartModel.findOne({ user: userId });
    if (guestCart) {
        if (userCart) {
            // merge products from guest cart to user cart
            guestCart.cartItems.forEach(guestItem => {
                const existingItem = userCart.cartItems.find(item => item.product.toString() === guestItem.product.toString());
                if (existingItem) {
                    existingItem.quantity += guestItem.quantity;
                }
                else {
                    userCart.cartItems.push(guestItem);
                }
            });
            userCart.markModified('cartItems');
            await userCart.save();
            // delete guest cart after moving its contents
            await Cart_1.CartModel.deleteOne({ _id: guestCart._id });
        }
        else {
            // transfer ownership of guest cart to user directly
            guestCart.user = userId;
            guestCart.sessionId = undefined; // important to avoid index issues
            await guestCart.save();
        }
    }
};
// 1. Signup
exports.signup = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, email, phone, password, image } = req.body;
    const existing = await customer_1.CustomerModel.findOne({ $or: [{ email }, { phone_number: phone }] });
    if (existing) {
        throw new Errors_1.BadRequest(existing.is_profile_complete
            ? "Customer already exists with this email or phone."
            : "You have an existing account from our store. Please login with your phone number to activate it.");
    }
    const newUser = new customer_1.CustomerModel({ name, email, phone_number: phone, password });
    if (image) {
        newUser.imagePath = await (0, handleImages_1.saveBase64Image)(image, newUser._id.toString(), req, 'profile_images');
    }
    await newUser.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Signup successful, please login.",
        action_required: "GO_TO_LOGIN"
    }, 201);
});
// 2. Login (The Main Router for Frontend)
exports.login = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    if (!identifier)
        throw new Errors_1.BadRequest('Please provide email, phone or name');
    const user = await customer_1.CustomerModel.findOne({
        $or: [{ email: identifier.toLowerCase() }, { phone_number: identifier }, { name: identifier }]
    }).select('+password');
    // Scenario 1: User doesn't exist at all
    if (!user) {
        throw new Errors_1.NotFound("Account not found.", {
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
            await (0, sendEmails_1.sendEmail)(user.email, 'Verification Code', `Your OTP code is ${otpCode}`);
        }
        return (0, response_1.SuccessResponse)(res, {
            message: 'Verification code sent to your contact info.',
            requires_otp: true,
            action_required: "GO_TO_OTP_SCREEN"
        }, 200);
    }
    // Scenario 3: Registered Online Client (Needs Password)
    if (!req.body.password) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Please enter your password to continue.",
            action_required: "SHOW_PASSWORD_FIELD"
        }, 200);
    }
    const isMatch = await bcryptjs_1.default.compare(req.body.password, user.password || '');
    if (!isMatch)
        throw new Errors_1.BadRequest('Incorrect password.');
    // --- الدمج الذكي للسلة عند تسجيل الدخول ---
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    await mergeCarts(user.id, sessionId);
    const token = await (0, generateJWT_1.default)({ id: user.id });
    const { password, __v, ...userResponse } = user.toObject();
    return (0, response_1.SuccessResponse)(res, {
        message: 'Login successful',
        user: userResponse,
        token,
        action_required: "GO_TO_HOME"
    }, 200);
});
// 3. Verify OTP
exports.verifyOtpAndLogin = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const { otp } = req.body;
    const user = await customer_1.CustomerModel.findOne({
        $or: [{ email: identifier }, { phone_number: identifier }, { name: identifier }]
    });
    if (!user || user.otp_code !== otp || (user.otp_expires_at && new Date() > user.otp_expires_at)) {
        throw new Errors_1.BadRequest('Invalid or expired OTP code.');
    }
    user.otp_code = undefined;
    user.otp_expires_at = undefined;
    await user.save();
    // If POS client, they MUST complete their profile (set password/name)
    if (!user.is_profile_complete) {
        return (0, response_1.SuccessResponse)(res, {
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
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    await mergeCarts(user.id, sessionId);
    const token = await (0, generateJWT_1.default)({ id: user.id });
    const { password, __v, ...userResponse } = user.toObject();
    return (0, response_1.SuccessResponse)(res, {
        message: 'Verified successfully',
        token,
        user: userResponse,
        action_required: "GO_TO_HOME"
    }, 200);
});
// 4. Complete Profile (The bridge from POS to Online)
exports.completeProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, name, email, password, confirmPassword, image } = req.body;
    if (password !== confirmPassword) {
        throw new Errors_1.BadRequest('Passwords do not match.');
    }
    const user = await customer_1.CustomerModel.findById(userId);
    if (!user)
        throw new Errors_1.NotFound("User not found.");
    if (name)
        user.name = name;
    if (email)
        user.email = email;
    if (password)
        user.password = password;
    if (image) {
        user.imagePath = await (0, handleImages_1.saveBase64Image)(image, user._id.toString(), req, 'profile_images');
    }
    await user.save();
    // --- الدمج الذكي للسلة بعد إكمال البروفايل ---
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    await mergeCarts(user.id, sessionId);
    const token = await (0, generateJWT_1.default)({ id: user.id });
    const { password: _, __v, ...userResponse } = user.toObject();
    return (0, response_1.SuccessResponse)(res, {
        message: "Account activated successfully!",
        token,
        user: userResponse,
        action_required: "GO_TO_HOME"
    }, 200);
});
// 5. Edit Profile
exports.editProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await customer_1.CustomerModel.findById(req.params.id);
    if (!user)
        throw new Errors_1.NotFound('User not found.');
    if (user.id !== req.user?.id)
        throw new Errors_1.UnauthorizedError('Not authorized.');
    const { phone, name, email, password, image } = req.body;
    if (image) {
        user.imagePath = await (0, handleImages_1.saveBase64Image)(image, user.id, req, 'profile_images');
    }
    if (phone)
        user.phone_number = phone;
    if (name)
        user.name = name;
    if (email)
        user.email = email;
    if (password)
        user.password = password;
    await user.save();
    return (0, response_1.SuccessResponse)(res, {
        message: 'Profile updated successfully',
        action_required: "REFRESH_PROFILE"
    }, 200);
});
// 6. Get Profile
exports.getProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await customer_1.CustomerModel.findById(req.user?.id);
    if (!user)
        throw new Errors_1.NotFound('User not found.');
    const { password, __v, ...userResponse } = user.toObject();
    return (0, response_1.SuccessResponse)(res, { message: 'Profile retrieved successfully', data: userResponse }, 200);
});
// 7. Resend OTP
exports.resendOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const user = await customer_1.CustomerModel.findOne({ $or: [{ email: identifier }, { phone_number: identifier }] });
    if (!user)
        throw new Errors_1.NotFound('User not found.');
    const otpCode = generateOtpCode();
    user.otp_code = otpCode;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    if (user.email)
        await (0, sendEmails_1.sendEmail)(user.email, 'Your OTP Code', `Your new code is ${otpCode}`);
    return (0, response_1.SuccessResponse)(res, {
        message: 'A new OTP has been sent.',
        requires_otp: true,
        action_required: "STAY_ON_OTP_SCREEN"
    }, 200);
});
