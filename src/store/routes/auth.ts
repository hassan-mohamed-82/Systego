import { Router } from 'express';
import { login, signup } from '../../store/controller/auth';
import { validate } from '../midlewares/validate';
import { loginSchema, signupSchema } from '../../store/validation/auth';
import { catchAsync } from '../../utils/catchAsync';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), catchAsync(login));
authRouter.post('/signup', validate(signupSchema), catchAsync(signup));

export default authRouter;