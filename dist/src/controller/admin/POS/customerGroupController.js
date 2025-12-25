"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getallgroups = exports.getCustomers = exports.createCustomer = exports.createCustomerGroup = void 0;
const customer_1 = require("../../../models/schema/admin/POS/customer");
const BadRequest_1 = require("../../../Errors/BadRequest");
const response_1 = require("../../../utils/response");
// Create Customer Group
const createCustomerGroup = async (req, res) => {
    const { name, status = true } = req.body;
    // Validate required fields
    if (!name) {
        throw new BadRequest_1.BadRequest("Group name is required");
    }
    // Check if group name already exists
    const existingGroup = await customer_1.CustomerGroupModel.findOne({ name });
    if (existingGroup) {
        throw new BadRequest_1.BadRequest("Customer group with this name already exists");
    }
    // Create new customer group
    const newCustomerGroup = new customer_1.CustomerGroupModel({
        name,
        status
    });
    const savedGroup = await newCustomerGroup.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group created successfully",
        customerGroup: savedGroup
    });
};
exports.createCustomerGroup = createCustomerGroup;
const createCustomer = async (req, res) => {
    const { name, email, phone_number, address, country, city, customer_group_id } = req.body;
    if (!name || !phone_number) {
        throw new BadRequest_1.BadRequest("Name and phone number are required");
    }
    const existingCustomer = await customer_1.CustomerModel.findOne({ phone_number });
    if (existingCustomer) {
        throw new BadRequest_1.BadRequest("Customer with this phone number already exists");
    }
    const customer = await customer_1.CustomerModel.create({
        name,
        email,
        phone_number,
        address,
        country,
        city,
        customer_group_id
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Customer created successfully",
        customer
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
const getallgroups = async (req, res) => {
    const groups = await customer_1.CustomerGroupModel.find();
    (0, response_1.SuccessResponse)(res, {
        message: "Customer groups fetched successfully",
        groups
    });
};
exports.getallgroups = getallgroups;
