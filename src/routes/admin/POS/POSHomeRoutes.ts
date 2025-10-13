import express from 'express';
import { getAllCategorys, getAllBrands, getProductsByCategory, getProductsByBrand, getAllSelections, getFeaturedProducts } from '../../../controller/admin/POS/POSHomeController';

const router = express.Router();


router.get('/categories', getAllCategorys);

router.get('/brands', getAllBrands);

router.get('/categories/:categoryId/products', getProductsByCategory);

router.get('/brands/:brandId/products', getProductsByBrand);

router.get('/selections', getAllSelections);

router.get('/featured', getFeaturedProducts);

export default router;