import express from 'express';
import { getPurchaseForReturn, createReturn, getAllReturns, getReturnById, getPurchaseReturns } from '../../controller/admin/returnPurchase';
import { authorizePermissions } from '../../middlewares/haspremission';
import { catchAsync } from '../../utils/catchAsync';
const router = express.Router();

router.post('/purchase-for-return', authorizePermissions("purchase_return", "View"), catchAsync(getPurchaseForReturn));
router.post('/create-return', authorizePermissions("purchase_return", "Add"), catchAsync(createReturn));
router.get('/all-returns', authorizePermissions("purchase_return", "View"), catchAsync(getAllReturns));
router.get('/return-by-id/:id', authorizePermissions("purchase_return", "View"), catchAsync(getReturnById));
router.get('/purchase-returns/:id', authorizePermissions("purchase_return", "View"), catchAsync(getPurchaseReturns));

export default router;
