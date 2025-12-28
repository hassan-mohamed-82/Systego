import express from 'express';
import { authorizePermissions } from "../../middlewares/haspremission"
import {
    createCustomer, deleteCustomer, getCustomerById, getCustomers, getDueCustomers, updateCustomer
    , getallgroups, getgroupbyid, creategroup, deletegroup, updategroup
} from '../../controller/admin/customer';
import { catchAsync } from '../../utils/catchAsync';

const router = express.Router();

router.post('/', authorizePermissions("POS", "Add"), authorizePermissions("customer", "Add"), catchAsync(createCustomer));
router.get('/', authorizePermissions("customer", "View"), catchAsync(getCustomers));

// Due customers route (must be before /:id)
router.get('/due', authorizePermissions("customer", "View"), catchAsync(getDueCustomers));

// Group Routes (must be before /:id to prevent "group" being treated as customer ID)
router.post('/group', authorizePermissions("customer_group", "Add"), catchAsync(creategroup));
router.get('/group', authorizePermissions("customer_group", "View"), catchAsync(getallgroups));
router.get('/group/:id', authorizePermissions("customer_group", "View"), catchAsync(getgroupbyid));
router.put('/group/:id', authorizePermissions("customer_group", "Edit"), catchAsync(updategroup));
router.delete('/group/:id', authorizePermissions("customer_group", "Delete"), catchAsync(deletegroup));

// Generic customer routes with :id parameter (must be LAST)
router.get('/:id', authorizePermissions("customer", "View"), catchAsync(getCustomerById));
router.put('/:id', authorizePermissions("customer", "Edit"), catchAsync(updateCustomer));
router.delete('/:id', authorizePermissions("customer", "Delete"), catchAsync(deleteCustomer));
export default router;