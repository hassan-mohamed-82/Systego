import express from 'express';
import { createCustomerGroup } from '../../../controller/admin/POS/customerGroupController';
import { catchAsync } from '../../../utils/catchAsync';
import {authorizePermissions} from "../../../middlewares/haspremission"

const router = express.Router();

router.post('/',authorizePermissions("POS","Add"),authorizePermissions("customer_group","Add"), catchAsync(createCustomerGroup));

export default router;