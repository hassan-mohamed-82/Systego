"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReturnSale = exports.getReturnSaleById = exports.getAllReturnSales = exports.createReturnSale = void 0;
const ReturnSale_1 = require("../../../models/schema/admin/POS/ReturnSale");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const Warehouse_1 = require("../../../models/schema/admin/Warehouse");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const product_price_1 = require("../../../models/schema/admin/product_price");
const createReturnSale = async (req, res) => {
    try {
        const { sale_id, return_date, return_reason } = req.body;
        const sale = await Sale_1.SaleModel.findById(sale_id);
        if (!sale)
            throw new Errors_1.NotFound('Sale not found');
        const customer = await customer_1.CustomerModel.findById(sale.customer_id);
        if (!customer)
            throw new Errors_1.NotFound('Customer not found');
        const warehouse = await Warehouse_1.WarehouseModel.findById(sale.warehouse_id);
        if (!warehouse)
            throw new Errors_1.NotFound('Warehouse not found');
        const productSales = await Sale_1.ProductSalesModel.find({ sale_id: sale_id });
        if (!productSales || productSales.length === 0) {
            throw new Errors_1.NotFound('No product sales found for this sale');
        }
        // Update quantities for all products in the sale
        for (const productSale of productSales) {
            const productPrice = await product_price_1.ProductPriceModel.findOne({ product_id: productSale.product_id });
            if (productPrice) {
                productPrice.quantity += productSale.quantity;
                await productPrice.save();
            }
        }
        const newReturnSale = new ReturnSale_1.ReturnSaleModel({
            sale_id,
            return_date: return_date || new Date(),
            return_reason
        });
        const savedReturnSale = await newReturnSale.save();
        const populatedReturnSale = await ReturnSale_1.ReturnSaleModel.findById(savedReturnSale._id)
            .populate('sale_id', 'reference grand_total customer_id warehouse_id');
        (0, response_1.SuccessResponse)(res, {
            message: 'Return sale created successfully',
            populatedReturnSale
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
};
exports.createReturnSale = createReturnSale;
// GET ALL RETURNS (with filters)  
const getAllReturnSales = async (req, res) => {
    try {
        const { warehouse_id, start_date, end_date } = req.query;
        const filter = {};
        if (start_date && end_date) {
            filter.return_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }
        const returnSales = await ReturnSale_1.ReturnSaleModel.find(filter)
            .populate({
            path: 'sale_id',
            select: 'reference grand_total customer_id warehouse_id',
            populate: [
                { path: 'customer_id', select: 'name' },
                { path: 'warehouse_id', select: 'name' }
            ]
        })
            .sort({ return_date: -1 });
        (0, response_1.SuccessResponse)(res, { returnSales });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
};
exports.getAllReturnSales = getAllReturnSales;
// GET SINGLE RETURN BY ID
const getReturnSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const returnSale = await ReturnSale_1.ReturnSaleModel.findById(id);
        if (!returnSale)
            throw new Errors_1.NotFound("Return sale not found");
        // Get detailed sale information with all populated data
        const sale = await Sale_1.SaleModel.findById(returnSale.sale_id)
            .populate('customer_id', 'name email phone_number')
            .populate('warehouse_id', 'name location')
            .populate('currency_id', 'code symbol')
            .populate('order_tax', 'name rate')
            .populate('order_discount', 'name rate')
            .populate('coupon_id', 'code discount_amount')
            .populate('gift_card_id', 'code amount')
            .lean();
        if (!sale)
            throw new Errors_1.NotFound("Original sale not found");
        // Get the returned products from the sale
        const returnedProducts = await Sale_1.ProductSalesModel.find({
            sale_id: returnSale.sale_id
        }).populate('product_id', 'name sku');
        (0, response_1.SuccessResponse)(res, {
            returnSale: {
                ...returnSale.toObject(),
                sale_details: sale,
                returned_products: returnedProducts
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
};
exports.getReturnSaleById = getReturnSaleById;
// delete return sale 
const deleteReturnSale = async (req, res) => {
    try {
        const { id } = req.params;
        const returnSale = await ReturnSale_1.ReturnSaleModel.findById(id);
        if (!returnSale)
            throw new Errors_1.NotFound("Return sale not found");
        // Before deleting, reverse the quantity update in product prices
        const productSales = await Sale_1.ProductSalesModel.find({
            sale_id: returnSale.sale_id
        });
        // Reverse the quantity updates
        for (const productSale of productSales) {
            const productPrice = await product_price_1.ProductPriceModel.findOne({
                product_id: productSale.product_id
            });
            if (productPrice) {
                productPrice.quantity -= productSale.quantity;
                await productPrice.save();
            }
        }
        // Delete the return sale
        await ReturnSale_1.ReturnSaleModel.findByIdAndDelete(id);
        (0, response_1.SuccessResponse)(res, { message: "Return sale deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
};
exports.deleteReturnSale = deleteReturnSale;
