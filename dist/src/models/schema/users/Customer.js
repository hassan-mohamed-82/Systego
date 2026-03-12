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
    addresses: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Address",
        },
    ],
}, { timestamps: true, });
CustomerSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
exports.CustomerModel = mongoose_2.default.model('customer', CustomerSchema);
