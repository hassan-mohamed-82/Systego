import { Router } from 'express';
import { signup, login, editProfile, getProfile, verifyOtpAndLogin, resendOtp } from '../../controller/users/auth';
import { validate } from '../../middlewares/validation';
import { authenticated } from '../../middlewares/authenticated';

import { loginSchema, resendOtpSchema, signupSchema, verifyOtpSchema } from '../../validation/users/auth';

const authRoute = Router();

authRoute.post("/signup", validate(signupSchema), signup);
authRoute.post("/login", validate(loginSchema), login);
authRoute.post("/verify-otp", validate(verifyOtpSchema), verifyOtpAndLogin);
authRoute.post("/resend-otp", validate(resendOtpSchema), resendOtp);

authRoute.put("/edit-profile/:id", authenticated, editProfile);
authRoute.get("/get-profile", authenticated, getProfile)

export default authRoute;