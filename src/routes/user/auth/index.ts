import { Router } from 'express';
import LocalAuth from "./auth";
import googleAuth from "./google";
const route = Router();

route.use('/local',LocalAuth)
route.use('/google',googleAuth)

export default route;