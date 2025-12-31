import express from 'express';
import { authorizePermissions } from "../../middlewares/haspremission"
import {
    createCustomer, deleteCustomer, getCustomerById, getCustomers, getDueCustomers, updateCustomer
    , getallgroups, getgroupbyid, creategroup, deletegroup, updategroup, getCountriesWithCities
} from '../../controller/admin/customer';
import { catchAsync } from '../../utils/catchAsync';

const router = express.Router();

router.post('/', authorizePermissions("POS", "Add"), authorizePermissions("customer", "Add"), catchAsync(createCustomer));
router.get('/', authorizePermissions("customer", "View"), catchAsync(getCustomers));
router.get('/countries', authorizePermissions("customer", "View"), catchAsync(getCountriesWithCities));

// Due customers route (must be before /:id)
router.get('/due', authorizePermissions("customer", "View"), catchAsync(getDueCustomers));

// Group Routes (must be before /:id to prevent "groups" being treated as customer ID)
router.post('/groups', authorizePermissions("customer_group", "Add"), catchAsync(creategroup));
router.get('/groups', authorizePermissions("customer_group", "View"), catchAsync(getallgroups));
router.get('/groups/:id', authorizePermissions("customer_group", "View"), catchAsync(getgroupbyid));
router.put('/groups/:id', authorizePermissions("customer_group", "Edit"), catchAsync(updategroup));
router.delete('/groups/:id', authorizePermissions("customer_group", "Delete"), catchAsync(deletegroup));

// Generic customer routes with :id parameter (must be LAST)
router.get('/:id', authorizePermissions("customer", "View"), catchAsync(getCustomerById));
router.put('/:id', authorizePermissions("customer", "Edit"), catchAsync(updateCustomer));
router.delete('/:id', authorizePermissions("customer", "Delete"), catchAsync(deleteCustomer));

export default router;
