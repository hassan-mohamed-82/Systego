import express from 'express';
import {
  toggleWishlist,
  getUserWishlist,
  clearWishlist
} from '../../controller/users/Wishlist';

import { authenticated } from '../../middlewares/authenticated';

const wishlistRoute = express.Router();

wishlistRoute.use(authenticated);

wishlistRoute.post('/toggle', toggleWishlist);
wishlistRoute.get('/', getUserWishlist);
wishlistRoute.delete('/clear', clearWishlist);

export default wishlistRoute;