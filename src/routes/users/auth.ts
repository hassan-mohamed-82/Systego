import { Router } from 'express';
import {
    signup,
    login,
    editProfile,
    getProfile,
    verifyOtpAndLogin,
    resendOtp,
    completeProfile // Import the new controller
} from '../../controller/users/auth';
import { validate } from '../../middlewares/validation';
import { authenticated } from '../../middlewares/authenticated';

import {
    loginSchema,
    resendOtpSchema,
    signupSchema,
    verifyOtpSchema,
    completeProfileSchema,
    editProfileSchema
} from '../../validation/users/auth';

const authRoute = Router();

// Authentication Flow
authRoute.post("/signup", validate(signupSchema), signup);
authRoute.post("/login", validate(loginSchema), login);
authRoute.post("/verify-otp", validate(verifyOtpSchema), verifyOtpAndLogin);
authRoute.post("/resend-otp", validate(resendOtpSchema), resendOtp);

// POS to Online transition
authRoute.post("/complete-profile", validate(completeProfileSchema), completeProfile);

// Profile Management
authRoute.put("/edit-profile/:id", authenticated, validate(editProfileSchema), editProfile);
authRoute.get("/get-profile", authenticated, getProfile);

export default authRoute;