import { Router } from 'express';
import { getAllProducts, getProductById } from '../../controller/users/products';

const productRoute = Router();

productRoute.get('/', getAllProducts);
productRoute.get('/:id', getProductById);

export default productRoute;