import express from 'express';
import { createCustomer } from '../../../controller/admin/POS/customer';
import { catchAsync } from '../../../utils/catchAsync';
import {authorizePermissions} from "../../../middlewares/haspremission"

const router = express.Router();

router.post('/',authorizePermissions("POS","Add"),authorizePermissions("customer","Add"), catchAsync(createCustomer));

export default router;