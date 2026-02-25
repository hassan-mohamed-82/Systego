import express from 'express';
import { getAllCategorys, getAllBrands, getProductsByCategory,
   getCashiers , getProductsByBrand, getAllSelections, getFeaturedProducts ,
selectCashier,getActiveBundles} from '../../../controller/admin/POS/POSHomeController';
import { authorizePermissions } from '../../../middlewares/haspremission';

const router = express.Router();


router.get('/categories',authorizePermissions("POS","View"), getAllCategorys);


router.get('/brands',authorizePermissions("POS","View"), getAllBrands);

router.get('/bundles',authorizePermissions("POS","View"), getActiveBundles);

router.get('/cashiers',authorizePermissions("POS","View"), getCashiers);

router.post('/cashiers/select',authorizePermissions("POS","Add"), selectCashier);

router.get('/categories/:categoryId/products',authorizePermissions("POS","View"), getProductsByCategory);
router.get('/brands/:brandId/products',authorizePermissions("POS","View"), getProductsByBrand);

router.get('/selections',authorizePermissions("POS","View"), getAllSelections);

router.get('/featured',authorizePermissions("POS","View"), getFeaturedProducts);

export default router;