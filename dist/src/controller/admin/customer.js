"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerSinglePageData = exports.getCountriesWithCities = exports.creategroup = exports.deletegroup = exports.updategroup = exports.getgroupbyid = exports.getallgroups = exports.customerandDuecustomers = exports.deleteCustomer = exports.updateCustomer = exports.getDueCustomers = exports.getCustomerById = exports.getCustomers = exports.createCustomer = void 0;
const customer_1 = require("../../models/schema/admin/POS/customer");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const Country_1 = require("../../models/schema/admin/Country");
const mongoose_1 = __importDefault(require("mongoose"));
const Sale_1 = require("../../models/schema/admin/POS/Sale");
const payment_1 = require("../../models/schema/admin/POS/payment");
const ReturnSale_1 = require("../../models/schema/admin/POS/ReturnSale");
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
    const customers = await customer_1.CustomerModel.find().populate('country', 'name').populate('city', 'name').populate('customer_group_id', 'name status');
    (0, response_1.SuccessResponse)(res, {
        message: "Customers fetched successfully",
        customers
    });
};
exports.getCustomers = getCustomers;
const getCustomerById = async (req, res) => {
    const customer = await customer_1.CustomerModel.findById(req.params.id).populate('country', 'name').populate('city', 'name').populate('customer_group_id', 'name status');
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
const customerandDuecustomers = async (req, res) => {
    const customers = await customer_1.CustomerModel.find();
    const dueCustomers = await customer_1.CustomerModel.find({ is_Due: true });
    (0, response_1.SuccessResponse)(res, {
        message: "Customers fetched successfully",
        customers,
        dueCustomers
    });
};
exports.customerandDuecustomers = customerandDuecustomers;
const getallgroups = async (req, res) => {
    // Get all customer groups
    const customerGroups = await customer_1.CustomerGroupModel.find();
    // For each group, find all customers that belong to it
    const groupsWithCustomers = await Promise.all(customerGroups.map(async (group) => {
        const customers = await customer_1.CustomerModel.find({ customer_group_id: group._id })
            .populate([
            { path: 'country', select: 'name code' },
            { path: 'city', select: 'name' }
        ]);
        return {
            _id: group._id,
            name: group.name,
            status: group.status,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            customers: customers
        };
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Customer groups fetched successfully",
        groups: groupsWithCustomers
    });
};
exports.getallgroups = getallgroups;
const getgroupbyid = async (req, res) => {
    const group = await customer_1.CustomerGroupModel.findById(req.params.id);
    if (!group) {
        throw new Errors_1.NotFound("Customer group not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group fetched successfully",
        group
    });
};
exports.getgroupbyid = getgroupbyid;
const updategroup = async (req, res) => {
    const group = await customer_1.CustomerGroupModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) {
        throw new Errors_1.NotFound("Customer group not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group updated successfully",
        group
    });
};
exports.updategroup = updategroup;
const deletegroup = async (req, res) => {
    const group = await customer_1.CustomerGroupModel.findByIdAndDelete(req.params.id);
    if (!group) {
        throw new Errors_1.NotFound("Customer group not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group deleted successfully",
        group
    });
};
exports.deletegroup = deletegroup;
const creategroup = async (req, res) => {
    const { name, status } = req.body;
    if (!name || !status) {
        throw new BadRequest_1.BadRequest("Name and status are required");
    }
    // Validate if there's existing group
    const existingGroup = await customer_1.CustomerGroupModel.findOne({ name });
    if (existingGroup) {
        throw new BadRequest_1.BadRequest("Customer group with this name already exists");
    }
    const group = new customer_1.CustomerGroupModel({ name, status });
    await group.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group created successfully",
        group
    });
};
exports.creategroup = creategroup;
const getCountriesWithCities = async (req, res) => {
    const countries = await Country_1.CountryModel.find().populate("cities");
    (0, response_1.SuccessResponse)(res, {
        message: "Countries with cities fetched successfully",
        countries,
    });
};
exports.getCountriesWithCities = getCountriesWithCities;
const getCustomerSinglePageData = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid customer id is required");
    }
    const customer = await customer_1.CustomerModel.findById(id)
        .populate('country', 'name')
        .populate('city', 'name');
    if (!customer) {
        throw new Errors_1.NotFound("Customer not found");
    }
    const customerObjectId = new mongoose_1.default.Types.ObjectId(id);
    const sales = await Sale_1.SaleModel.find({
        $or: [
            { customer_id: customerObjectId },
            { Due_customer_id: customerObjectId },
        ],
    })
        .select('reference grand_total paid_amount remaining_amount date createdAt')
        .sort({ createdAt: -1 });
    const saleIds = sales.map((sale) => sale._id);
    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.grand_total || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paid_amount || 0), 0);
    const outstandingBalance = sales.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0);
    const lastOrderDate = sales.length > 0 ? sales[0].date || sales[0].createdAt : null;
    const paymentDocs = saleIds.length
        ? await payment_1.PaymentModel.find({ sale_id: { $in: saleIds } })
            .populate('sale_id', 'reference')
            .populate('financials.account_id', 'name')
            .sort({ createdAt: -1 })
        : [];
    const paymentHistory = paymentDocs.flatMap((payment) => {
        const lines = Array.isArray(payment.financials) ? payment.financials : [];
        return lines.map((line, index) => {
            const accountName = line?.account_id?.name || 'Unknown';
            return {
                payment_id: payment._id,
                date: payment.createdAt,
                amount: Number(line?.amount || 0),
                payment_method: accountName,
                reference_number: payment?.sale_id?.reference || null,
                notes: payment.payment_proof || '',
                line_no: index + 1,
            };
        });
    });
    const returnDocs = await ReturnSale_1.ReturnModel.find({ customer_id: customerObjectId })
        .select('reference sale_reference date items total_amount createdAt')
        .sort({ createdAt: -1 });
    const returns = returnDocs.map((ret) => ({
        return_number: ret.reference,
        order_number: ret.sale_reference,
        date: ret.date || ret.createdAt,
        items_returned: Array.isArray(ret.items)
            ? ret.items.reduce((sum, item) => sum + Number(item.returned_quantity || 0), 0)
            : 0,
        refund_amount: Number(ret.total_amount || 0),
        status: 'completed',
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Customer single page data fetched successfully",
        customer: {
            customer_name: customer.name,
            phone_number: customer.phone_number,
            email: customer.email || null,
            address: customer.address || null,
            city: customer.city?.name || null,
            country: customer.country?.name || null,
            cards: {
                total_orders: totalOrders,
            },
            financial_summary: {
                total_revenue: totalRevenue,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                last_order_date: lastOrderDate,
            },
            payment_history: paymentHistory,
            returns,
        },
    });
};
exports.getCustomerSinglePageData = getCustomerSinglePageData;
