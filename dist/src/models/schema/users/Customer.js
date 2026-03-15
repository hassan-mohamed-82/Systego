"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModel = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CustomerSchema = new mongoose_1.Schema({
    username: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },
    email: {
        type: String,
        unique: [true, "Email must be unique"],
        sparse: true,
        trim: true,
        lowercase: true,
    },
    phone_number: {
        type: String,
        required: [true, "Phone number is required"],
        unique: [true, "Phone number must be unique"],
        trim: true,
        minlength: [10, "Too short phone number"],
        maxlength: [15, "Too long phone number"],
    },
    password: {
        type: String,
        minlength: [6, "Too short password"],
    },
    is_profile_complete: {
        type: Boolean,
        default: false,
    },
    otp_code: {
        type: String,
        default: null,
    },
    otp_expires_at: {
        type: Date,
        default: null,
    },
    imagePath: {
        type: String,
        default: null,
    },
    wishlist: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Products",
        },
    ],
    addresses: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Address",
        },
    ],
}, { timestamps: true, });
CustomerSchema.pre("save", async function (next) {
    this.is_profile_complete = Boolean(this.username?.trim() && this.password);
    if (!this.isModified("password") || !this.password)
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
exports.CustomerModel = mongoose_2.default.model('UserStore', CustomerSchema);
