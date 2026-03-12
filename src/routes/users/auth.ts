import { Router } from 'express';
import { signup, login, editProfile, getProfile } from '../../controller/users/auth';
import { validate } from '../../middlewares/validation';
import { authenticated } from '../../middlewares/authenticated';

import { loginSchema, signupSchema } from '../../validation/users/auth';

const authRoute = Router();

authRoute.post("/signup", validate(signupSchema), signup);
authRoute.post("/login", validate(loginSchema), login);

authRoute.put("/edit-profile/:id", authenticated, editProfile);
authRoute.get("/get-profile", authenticated, getProfile)

export default authRoute;