import express from 'express';
import {
  addProductToWishlist,
  removeProductFromWishlist,
  getUserWishlist,
  checkProductInWishlist,
  clearWishlist
} from '../../controller/users/Wishlist';

import { authenticated } from '../../middlewares/authenticated';

const wishlistRoute = express.Router();

wishlistRoute.use(authenticated)

wishlistRoute.post('/add', addProductToWishlist);
wishlistRoute.delete('/remove', removeProductFromWishlist);
wishlistRoute.get('/', getUserWishlist);
wishlistRoute.get('/check/:productId', checkProductInWishlist);
wishlistRoute.delete('/clear', clearWishlist);

export default wishlistRoute;