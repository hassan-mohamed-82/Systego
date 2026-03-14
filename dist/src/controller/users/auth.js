"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.editProfile = exports.resendOtp = exports.verifyOtpAndLogin = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const generateJWT_1 = __importDefault(require("../../middlewares/generateJWT"));
const handleImages_1 = require("../../utils/handleImages");
const Customer_1 = require("../../models/schema/users/Customer");
const sendEmails_1 = require("../../utils/sendEmails");
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const signup = async (req, res) => {
    const { name, username, email, phone, password } = req.body;
    const existing = await Customer_1.CustomerModel.findOne({ email });
    if (existing)
        throw new Errors_1.UniqueConstrainError("Email", "User already signed up with this email");
    const existingUsername = await Customer_1.CustomerModel.findOne({ username });
    if (existingUsername)
        throw new Errors_1.UniqueConstrainError("Username", "User already signed up with this username");
    const userData = {
        name,
        username,
        email,
        phone_number: phone,
        password
    };
    const newUser = new Customer_1.CustomerModel(userData);
    await newUser.save();
    (0, response_1.SuccessResponse)(res, { message: "Signup successful" }, 201);
};
exports.signup = signup;
exports.login = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier ?? req.body.email;
    const user = await Customer_1.CustomerModel.findOne({
        $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
        throw new BadRequest_1.BadRequest('Incorrect email/username or password');
    }
    if (!user.is_profile_complete) {
        if (!user.email) {
            throw new BadRequest_1.BadRequest('Email is required to receive OTP');
        }
        const otpCode = generateOtpCode();
        user.otp_code = otpCode;
        user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await (0, sendEmails_1.sendEmail)(user.email, 'Your OTP Code', `Your OTP code is ${otpCode}. It will expire in 10 minutes.`);
        return (0, response_1.SuccessResponse)(res, {
            message: 'OTP sent to your email',
            requires_otp: true,
        }, 200);
    }
    if (!req.body.password) {
        throw new BadRequest_1.BadRequest('Password is required');
    }
    if (!user.password || !(await bcryptjs_1.default.compare(req.body.password, user.password))) {
        throw new BadRequest_1.BadRequest('Incorrect email/username or password');
    }
    const { password, __v, ...userResponse } = user.toObject();
    const token = await (0, generateJWT_1.default)({ id: user.id });
    return (0, response_1.SuccessResponse)(res, {
        message: 'User logged in successfully',
        user: userResponse,
        token
    }, 200);
});
exports.verifyOtpAndLogin = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier ?? req.body.email;
    const { otp } = req.body;
    const user = await Customer_1.CustomerModel.findOne({
        $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    if (!user.otp_code || !user.otp_expires_at) {
        throw new BadRequest_1.BadRequest('No OTP found for this user');
    }
    if (user.otp_code !== otp) {
        throw new BadRequest_1.BadRequest('Invalid OTP');
    }
    if (new Date() > user.otp_expires_at) {
        throw new BadRequest_1.BadRequest('OTP expired');
    }
    user.otp_code = undefined;
    user.otp_expires_at = undefined;
    await user.save();
    const token = await (0, generateJWT_1.default)({ id: user.id });
    const { password, __v, otp_code, otp_expires_at, ...userResponse } = user.toObject();
    return (0, response_1.SuccessResponse)(res, {
        message: 'OTP verified successfully',
        token,
        user: userResponse,
        requires_otp: false,
    }, 200);
});
exports.resendOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const identifier = req.body.identifier ?? req.body.email;
    const user = await Customer_1.CustomerModel.findOne({
        $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    if (user.is_profile_complete) {
        throw new BadRequest_1.BadRequest('User profile is already complete and does not require OTP');
    }
    if (!user.email) {
        throw new BadRequest_1.BadRequest('Email is required to receive OTP');
    }
    const otpCode = generateOtpCode();
    user.otp_code = otpCode;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await (0, sendEmails_1.sendEmail)(user.email, 'Your OTP Code', `Your OTP code is ${otpCode}. It will expire in 10 minutes.`);
    return (0, response_1.SuccessResponse)(res, {
        message: 'OTP resent successfully',
        requires_otp: true,
    }, 200);
});
exports.editProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await Customer_1.CustomerModel.findById(req.params.id);
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    if (user.id !== req.user?.id) {
        throw new Errors_1.UnauthorizedError('You are not authorized to edit this profile');
    }
    const { name, phone, username, email, password } = req.body;
    const folder = 'profile_images';
    const imageUrl = req.user?.id ? await (0, handleImages_1.saveBase64Image)(req.body.image, req.user.id, req, folder) : null;
    if (imageUrl)
        user.imagePath = imageUrl;
    if (name)
        user.name = name;
    if (phone)
        user.phone_number = phone;
    if (username && username !== user.username) {
        const existingUsername = await Customer_1.CustomerModel.findOne({ username, _id: { $ne: user.id } });
        if (existingUsername)
            throw new Errors_1.UniqueConstrainError('Username', 'Username already exists');
        user.username = username;
    }
    if (email && email !== user.email) {
        const existingEmail = await Customer_1.CustomerModel.findOne({ email, _id: { $ne: user.id } });
        if (existingEmail)
            throw new Errors_1.UniqueConstrainError('Email', 'Email already exists');
        user.email = email;
    }
    if (password)
        user.password = password;
    await user.save();
    return (0, response_1.SuccessResponse)(res, {
        message: 'Profile updated successfully',
        is_profile_complete: user.is_profile_complete,
        requires_otp: !user.is_profile_complete,
    }, 200);
});
exports.getProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await Customer_1.CustomerModel.findById(req.user?.id).select('-password -__v');
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Profile retrieved successfully',
        data: user,
        is_profile_complete: user.is_profile_complete,
        requires_otp: !user.is_profile_complete,
    }, 200);
});
