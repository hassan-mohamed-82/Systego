import { Router } from 'express';
import { 
  createPaymentMethod, 
  getAllPaymentMethods, 
  getPaymentMethodById, 
  updatePaymentMethod, 
  deletePaymentMethod 
} from '../../controller/admin/payment_method';
import { catchAsync } from '../../utils/catchAsync';
import { validate } from '../../middlewares/validation';
import { CreatePaymentMethodSchema, UpdatePaymentMethodSchema } from '../../validation/admin/payment_method';
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.post(
  '/',
  authorizePermissions("payment_method","Add"),
  validate(CreatePaymentMethodSchema),
  catchAsync(createPaymentMethod)
);

router.get('/',authorizePermissions("payment_method","View"), catchAsync(getAllPaymentMethods));

router.get('/:id',authorizePermissions("payment_method","View"), catchAsync(getPaymentMethodById));

router.put(
  '/:id',
  authorizePermissions("payment_method","Edit"),
  validate(UpdatePaymentMethodSchema),
  catchAsync(updatePaymentMethod)
);

router.delete('/:id',authorizePermissions("payment_method","Delete"), catchAsync(deletePaymentMethod));

export default router;
