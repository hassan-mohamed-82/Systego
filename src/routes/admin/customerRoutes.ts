import express from 'express';
import {authorizePermissions} from "../../middlewares/haspremission"
import { createCustomer, deleteCustomer, getCustomerById, getCustomers, getDueCustomers, updateCustomer 
    ,getallgroups,getgroupbyid,getCountriesWithCities
} from '../../controller/admin/customer';
import { catchAsync } from '../../utils/catchAsync';

const router = express.Router();

router.post('/',authorizePermissions("POS","Add"),authorizePermissions("customer","Add"), catchAsync(createCustomer));
router.get('/',authorizePermissions("customer","View"), catchAsync(getCustomers));
router.get('/countries',authorizePermissions("customer","View"), catchAsync(getCountriesWithCities));
router.get('/groups',authorizePermissions("customer_group","View"), catchAsync(getallgroups));
router.get('/groups/:id',authorizePermissions("customer_group","View"), catchAsync(getgroupbyid));
router.get('/:id',authorizePermissions("customer","View"), catchAsync(getCustomerById));
router.get('/due',authorizePermissions("customer","View"), catchAsync(getDueCustomers));
router.put('/:id',authorizePermissions("customer","Edit"), catchAsync(updateCustomer));
router.delete('/:id',authorizePermissions("customer","Delete"), catchAsync(deleteCustomer));
export default router;