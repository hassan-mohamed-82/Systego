"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform_User = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const PlatformUserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        trim: true,
        required: [true, "Name is required"],
    },
    email: {
        type: String,
        required: [true, "Email must be provided"],
        unique: [true, "Email must be unique"],
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
        required: [true, "Password is required"],
        minlength: [6, "Too short password"],
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
}, { timestamps: true, });
PlatformUserSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    this.password = await bcrypt_1.default.hash(this.password, 10);
    next();
});
exports.Platform_User = mongoose_2.default.model('platform_user', PlatformUserSchema);
