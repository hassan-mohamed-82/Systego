"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = exports.login = void 0;
const User_1 = require("../../models/schema/admin/User");
const auth_1 = require("../../utils/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const roles_1 = require("../../models/schema/admin/roles");
const Action_1 = require("../../models/schema/admin/Action");
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new BadRequest_1.BadRequest("Email and password are required");
        }
        // ✅ نجيب المستخدم
        const user = await User_1.UserModel.findOne({ email })
            .populate("positionId")
            .lean();
        if (!user) {
            throw new NotFound_1.NotFound("User not found");
        }
        // ✅ تحقق من كلمة السر
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Errors_1.UnauthorizedError("Invalid email or password");
        }
        // ✅ نجيب الـ roles المرتبطة بالـ position
        const roles = await roles_1.RoleModel.find({ positionId: user.positionId?._id }).lean();
        // ✅ نجيب الـ actions المرتبطة بالـ roles
        let actions = [];
        if (roles && roles.length > 0) {
            actions = await Action_1.ActionModel.find({ roleId: { $in: roles.map(r => r._id) } }).lean();
        }
        // 📌 Debugging logs (ممكن تشيلها بعد ما تتأكد)
        console.log("user.positionId:", user.positionId);
        console.log("roles:", roles);
        console.log("actions:", actions);
        // ✅ نولد التوكن
        const token = (0, auth_1.generateToken)({
            _id: user._id,
            username: user.username,
            role: user.role,
            positionId: user.positionId?._id || null,
            roles: roles || [],
            actions: actions || [],
        });
        // ✅ نرجّع الاستجابة
        (0, response_1.SuccessResponse)(res, {
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const signup = async (req, res) => {
    const data = req.body;
    // ✅ check if user already exists
    const existingUser = await User_1.UserModel.findOne({
        $or: [{ email: data.email }, { phone: data.phone }],
    });
    if (existingUser) {
        if (existingUser.email === data.email) {
            throw new Errors_1.ConflictError("Email is already registered");
        }
        if (existingUser.phone === data.phone) {
            throw new Errors_1.ConflictError("Phone Number is already used");
        }
    }
    // ✅ hash password
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
    // ✅ create new user
    const newUser = await User_1.UserModel.create({
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
        const imageUrl = await (0, handleImages_1.saveBase64Image)(data.imageBase64, newUser._id.toString(), req, "users");
        newUser.image_url = imageUrl;
        await newUser.save();
    }
    (0, response_1.SuccessResponse)(res, {
        message: "User Signup Successfully. Please login.",
    }, 201);
};
exports.signup = signup;
