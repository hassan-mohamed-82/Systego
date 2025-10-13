"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomer = void 0;
const customer_1 = require("../../../models/schema/admin/POS/customer");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
// Create Customer
const createCustomer = async (req, res) => {
    const { name, email, phone_number, address, country, city, customer_group_id } = req.body;
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
        customer_group_id
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
