"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.getDueCustomers = exports.getCustomerById = exports.getCustomers = exports.createCustomer = void 0;
const customer_1 = require("../../models/schema/admin/POS/customer");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
// Create Customer
const createCustomer = async (req, res) => {
    const { name, email, phone_number, address, country, city, customer_group_id, is_Due, amount_Due, } = req.body;
    // Validate required fields
    if (!name || !phone_number) {
        throw new BadRequest_1.BadRequest("Name and phone number are required");
    }
    // Check if phone number already exists
    const existingCustomer = await customer_1.CustomerModel.findOne({ phone_number });
    if (existingCustomer) {
        throw new BadRequest_1.BadRequest("Customer with this phone number already exists");
    }
    // Check if email already exists (if provided)
    if (email) {
        const existingEmail = await customer_1.CustomerModel.findOne({ email });
        if (existingEmail) {
            throw new BadRequest_1.BadRequest("Customer with this email already exists");
        }
    }
    // Validate customer group if provided
    if (customer_group_id) {
        const customerGroup = await customer_1.CustomerGroupModel.findById(customer_group_id);
        if (!customerGroup) {
            throw new Errors_1.NotFound("Customer group not found");
        }
        if (!customerGroup.status) {
            throw new BadRequest_1.BadRequest("Customer group is inactive");
        }
    }
    // Create new customer
    const newCustomer = new customer_1.CustomerModel({
        name,
        email,
        phone_number,
        address,
        country,
        city,
        customer_group_id,
        is_Due,
        amount_Due,
    });
    const savedCustomer = await newCustomer.save();
    // Populate references for response
    await savedCustomer.populate([
        { path: 'country', select: 'name code' },
        { path: 'city', select: 'name' },
        { path: 'customer_group_id', select: 'name status' }
    ]);
    (0, response_1.SuccessResponse)(res, {
        message: "Customer created successfully",
        customer: savedCustomer
    });
};
exports.createCustomer = createCustomer;
const getCustomers = async (req, res) => {
    const customers = await customer_1.CustomerModel.find();
    (0, response_1.SuccessResponse)(res, {
        message: "Customers fetched successfully",
        customers
    });
};
exports.getCustomers = getCustomers;
const getCustomerById = async (req, res) => {
    const customer = await customer_1.CustomerModel.findById(req.params.id);
    if (!customer) {
        throw new Errors_1.NotFound("Customer not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer fetched successfully",
        customer
    });
};
exports.getCustomerById = getCustomerById;
const getDueCustomers = async (req, res) => {
    const customers = await customer_1.CustomerModel.find({ is_Due: true });
    (0, response_1.SuccessResponse)(res, {
        message: "Due customers fetched successfully",
        customers
    });
};
exports.getDueCustomers = getDueCustomers;
const updateCustomer = async (req, res) => {
    const customer = await customer_1.CustomerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) {
        throw new Errors_1.NotFound("Customer not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer updated successfully",
        customer
    });
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    const customer = await customer_1.CustomerModel.findByIdAndDelete(req.params.id);
    if (!customer) {
        throw new Errors_1.NotFound("Customer not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer deleted successfully",
        customer
    });
};
exports.deleteCustomer = deleteCustomer;
