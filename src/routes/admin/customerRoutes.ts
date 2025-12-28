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
router.get('/:id', authorizePermissions("customer", "View"), catchAsync(getCustomerById));
router.get('/due', authorizePermissions("customer", "View"), catchAsync(getDueCustomers));
router.put('/:id', authorizePermissions("customer", "Edit"), catchAsync(updateCustomer));
router.delete('/:id', authorizePermissions("customer", "Delete"), catchAsync(deleteCustomer));

// Group Routes
router.post('/group', authorizePermissions("customer_group", "Add"), catchAsync(creategroup));
router.get('/group', authorizePermissions("customer_group", "View"), catchAsync(getallgroups));
router.get('/group/:id', authorizePermissions("customer_group", "View"), catchAsync(getgroupbyid));
router.put('/group/:id', authorizePermissions("customer_group", "Edit"), catchAsync(updategroup));
router.delete('/group/:id', authorizePermissions("customer_group", "Delete"), catchAsync(deletegroup));
export default router;