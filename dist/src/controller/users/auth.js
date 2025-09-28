"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.editProfile = exports.login = exports.signup = void 0;
const platformUser_1 = require("../../models/schema/users/platformUser");
const bcrypt_1 = __importDefault(require("bcrypt"));
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const generateJWT_1 = __importDefault(require("../../middlewares/generateJWT"));
const handleImages_1 = require("../../utils/handleImages");
const signup = async (req, res) => {
    const { name, email, phone, password } = req.body;
    const existing = await platformUser_1.Platform_User.findOne({ email });
    if (existing)
        throw new Errors_1.UniqueConstrainError("Email", "User already signed up with this email");
    const userData = {
        name,
        email,
        phone_number: phone,
        password
    };
    const newUser = new platformUser_1.Platform_User(userData);
    await newUser.save();
    (0, response_1.SuccessResponse)(res, { message: "Signup successful" }, 201);
};
exports.signup = signup;
exports.login = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await platformUser_1.Platform_User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt_1.default.compare(req.body.password, user.password))) {
        throw new BadRequest_1.BadRequest('Incorrect email or password');
    }
    const token = await (0, generateJWT_1.default)({ id: user.id });
    return (0, response_1.SuccessResponse)(res, { message: 'User logged in successfully', token }, 200);
});
exports.editProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await platformUser_1.Platform_User.findById(req.params.id);
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    if (user.id !== req.user?.id) {
        throw new Errors_1.UnauthorizedError('You are not authorized to edit this profile');
    }
    const { name, phone } = req.body;
    const folder = 'profile_images';
    const imageUrl = req.user?.id ? await (0, handleImages_1.saveBase64Image)(req.body.image, req.user.id, req, folder) : null;
    if (imageUrl)
        user.imagePath = imageUrl;
    if (name)
        user.name = name;
    if (phone)
        user.phone_number = phone;
    await user.save();
    return (0, response_1.SuccessResponse)(res, { message: 'Profile updated successfully' }, 200);
});
// getProfiel user
exports.getProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await platformUser_1.Platform_User.findById(req.user?.id).select('-password -v');
    if (!user) {
        throw new Errors_1.NotFound('User not found');
    }
    return (0, response_1.SuccessResponse)(res, { message: 'Profile retrieved successfully', data: user }, 200);
});
