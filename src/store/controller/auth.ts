import { Request, Response } from "express";
import { CustomerModel } from "../../store/models/customers";
import bcrypt from "bcryptjs";
import { SuccessResponse } from "../../utils/response";
import { UniqueConstrainError } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import asyncHandler from 'express-async-handler';
import generateJWT from '../../middlewares/generateJWT';


export const signup = async (req: Request, res: Response) => {
    const { name, email, phone, password } = req.body;

    const existing = await CustomerModel.findOne({ email });
    if (existing) throw new UniqueConstrainError("Email", "User already signed up with this email");

    const userData: any = {
        name,
        email,
        phone_number: phone,
        password
    };

    const newUser = new CustomerModel(userData);

    await newUser.save();

    SuccessResponse(res, { message: "Signup successful" }, 201);
};


export const login = asyncHandler(async (req: Request, res: Response) => {
    const user = await CustomerModel.findOne({ email: req.body.email });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        throw new BadRequest('Incorrect email or password');
    }

    const token = await generateJWT({ id: user.id });

    return SuccessResponse(res, { message: 'User logged in successfully', data: { user, token } }, 200);
});






