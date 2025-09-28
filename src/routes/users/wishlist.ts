import express from 'express';
import {
  addProductToWishlist,
  removeProductFromWishlist,
  getUserWishlist,
  checkProductInWishlist,
  clearWishlist
} from '../../controller/users/Wishlist';

import { authenticated } from '../../middlewares/authenticated';

const router = express.Router();

router.use(authenticated)

router.post('/add', addProductToWishlist);
router.delete('/remove', removeProductFromWishlist);
router.get('/', getUserWishlist);
router.get('/check/:productId', checkProductInWishlist);
router.delete('/clear', clearWishlist);

export default router;