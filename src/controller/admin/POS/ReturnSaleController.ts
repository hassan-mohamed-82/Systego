import { Request, Response } from 'express';
import { ReturnSaleModel } from '../../../models/schema/admin/POS/ReturnSale';
import { NotFound } from '../../../Errors';
import { SuccessResponse } from '../../../utils/response';
import { BadRequest } from '../../../Errors/BadRequest';
import { WarehouseModel } from '../../../models/schema/admin/Warehouse';
import { SaleModel, ProductSalesModel } from '../../../models/schema/admin/POS/Sale';
import { CustomerModel } from '../../../models/schema/admin/POS/customer';
import { ProductPriceModel } from '../../../models/schema/admin/product_price';


export const createReturnSale = async (req: Request, res: Response) => {
    try {
        const { sale_id, return_date, return_reason } = req.body;

        const sale = await SaleModel.findById(sale_id);
        if (!sale) throw new NotFound('Sale not found');

        const customer = await CustomerModel.findById(sale.customer_id);  
        if (!customer) throw new NotFound('Customer not found');  
  
        const warehouse = await WarehouseModel.findById(sale.warehouse_id);  
        if (!warehouse) throw new NotFound('Warehouse not found');

        const productSales = await ProductSalesModel.find({ sale_id: sale_id });
        if (!productSales || productSales.length === 0) {
            throw new NotFound('No product sales found for this sale');
        }

        // Update quantities for all products in the sale
        for (const productSale of productSales) {
            const productPrice = await ProductPriceModel.findOne({ product_id: productSale.product_id });
            if (productPrice) {
                productPrice.quantity += productSale.quantity;
                await productPrice.save();
            }
        }

        const newReturnSale = new ReturnSaleModel({
            sale_id,
            return_date: return_date || new Date(),
            return_reason
        });

        const savedReturnSale = await newReturnSale.save();
        
        const populatedReturnSale = await ReturnSaleModel.findById(savedReturnSale._id)
            .populate('sale_id', 'reference grand_total customer_id warehouse_id');

        SuccessResponse(res, {
            message: 'Return sale created successfully', 
            populatedReturnSale
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
}

// GET ALL RETURNS (with filters)  
export const getAllReturnSales = async (req: Request, res: Response) => {
    try {
        const { warehouse_id, start_date, end_date } = req.query;
        const filter: any = {};
        
        if (start_date && end_date) {
            filter.return_date = { 
                $gte: new Date(start_date as string), 
                $lte: new Date(end_date as string) 
            };
        }

        const returnSales = await ReturnSaleModel.find(filter)
            .populate({
                path: 'sale_id',
                select: 'reference grand_total customer_id warehouse_id',
                populate: [
                    { path: 'customer_id', select: 'name' },
                    { path: 'warehouse_id', select: 'name' }
                ]
            })
            .sort({ return_date: -1 });

        SuccessResponse(res, { returnSales });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
};

// GET SINGLE RETURN BY ID
export const getReturnSaleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const returnSale = await ReturnSaleModel.findById(id);
        if (!returnSale) throw new NotFound("Return sale not found");

        // Get detailed sale information with all populated data
        const sale = await SaleModel.findById(returnSale.sale_id)
            .populate('customer_id', 'name email phone_number')
            .populate('warehouse_id', 'name location')
            .populate('currency_id', 'code symbol')
            .populate('order_tax', 'name rate')
            .populate('order_discount', 'name rate')
            .populate('coupon_id', 'code discount_amount')
            .populate('gift_card_id', 'code amount')
            .lean();

        if (!sale) throw new NotFound("Original sale not found");

        // Get the returned products from the sale
        const returnedProducts = await ProductSalesModel.find({ 
            sale_id: returnSale.sale_id 
        }).populate('product_id', 'name sku');

        SuccessResponse(res, { 
            returnSale: {
                ...returnSale.toObject(),
                sale_details: sale,
                returned_products: returnedProducts
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
}

// delete return sale 
export const deleteReturnSale = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const returnSale = await ReturnSaleModel.findById(id);
        if (!returnSale) throw new NotFound("Return sale not found");

        // Before deleting, reverse the quantity update in product prices
        const productSales = await ProductSalesModel.find({ 
            sale_id: returnSale.sale_id 
        });

        // Reverse the quantity updates
        for (const productSale of productSales) {
            const productPrice = await ProductPriceModel.findOne({ 
                product_id: productSale.product_id 
            });
            if (productPrice) {
                productPrice.quantity -= productSale.quantity;
                await productPrice.save();
            }
        }

        // Delete the return sale
        await ReturnSaleModel.findByIdAndDelete(id);
        
        SuccessResponse(res, { message: "Return sale deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error });
    }
}



            

