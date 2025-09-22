import { Router } from 'express';
import { 
  createPaymentMethod, 
  getAllPaymentMethods, 
  getPaymentMethodById, 
  updatePaymentMethod, 
  deletePaymentMethod 
} from '../controller/payment_method';
import { catchAsync } from '../utils/catchAsync';
import { validate } from '../middlewares/validation';
import { CreatePaymentMethodSchema, UpdatePaymentMethodSchema } from '../validation/payment_method';

const router = Router();

router.post(
  '/',
  validate(CreatePaymentMethodSchema),
  catchAsync(createPaymentMethod)
);

router.get('/', catchAsync(getAllPaymentMethods));

router.get('/:id', catchAsync(getPaymentMethodById));

router.put(
  '/:id',
  validate(UpdatePaymentMethodSchema),
  catchAsync(updatePaymentMethod)
);

router.delete('/:id', catchAsync(deletePaymentMethod));

export default router;
