import express from 'express';
import { getAllCategorys, getAllBrands, getProductsByCategory,
   getCashiers , getProductsByBrand, getAllSelections, getFeaturedProducts ,
selectCashier} from '../../../controller/admin/POS/POSHomeController';

const router = express.Router();


router.get('/categories', getAllCategorys);


router.get('/brands', getAllBrands);

router.get('/cashiers', getCashiers);

router.post('/cashiers/select', selectCashier);

router.get('/brands/:brandId/products', getProductsByBrand);

router.get('/selections', getAllSelections);

router.get('/featured', getFeaturedProducts);

export default router;