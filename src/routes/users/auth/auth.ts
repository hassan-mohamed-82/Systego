import { Router } from 'express';
import { signup, login, editProfile, getProfile} from '../../../controller/users/auth';
import { validate } from '../../../middlewares/validation';
import { authenticated } from '../../../middlewares/authenticated';

import {loginSchema, signupSchema} from '../../../validation/users/auth';

const route = Router();

route.post("/signup", validate(signupSchema), signup);
route.post("/login", validate(loginSchema), login);
route.put("/edit-profile/:id", authenticated, editProfile);
route.get("/get-profile", authenticated, getProfile)

export default route;