import { ProductModel } from "../../../models/schema/admin/products";
import { CategoryModel } from "../../../models/schema/admin/category";
import { BrandModel } from "../../../models/schema/admin/brand";
import { CouponModel } from '../../../models/schema/admin/coupons';
import { TaxesModel } from '../../../models/schema/admin/Taxes';
import { DiscountModel } from '../../../models/schema/admin/Discount';
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { GiftCardModel } from '../../../models/schema/admin/POS/giftCard';
import { PaymentMethodModel } from '../../../models/schema/admin/payment_methods';
import { ProductPriceModel, ProductPriceOptionModel } from '../../../models/schema/admin/product_price';
import { CustomerModel, CustomerGroupModel } from '../../../models/schema/admin/POS/customer';
import { NotFound } from "../../../Errors";
import { SuccessResponse } from "../../../utils/response";
import { Request, Response } from "express";
import { BankAccountModel } from "../../../models/schema/admin/Financial_Account";

// get all category 
export const getAllCategorys = async (req: Request, res: Response) => {
    const category = await CategoryModel.find()
 SuccessResponse(res, {message: "Category list", category});
}

// get all brand 
export const getAllBrands = async (req: Request, res: Response) => {
    const brand = await BrandModel.find();
 SuccessResponse(res, {message: "Brand list", brand});
}

// get all products by category 
export const getProductsByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const category = await CategoryModel.findById(categoryId);
    if (!category) throw new NotFound("Category not found");
    const products = await ProductModel.find({ categoryId: categoryId }).select('name price image ar-name');
    SuccessResponse(res, {message: "Products list", products});
}

// get all products by brand 
export const getProductsByBrand = async (req: Request, res: Response) => {
    const { brandId } = req.params;
    const brand = await BrandModel.findById(brandId);
    if (!brand) throw new NotFound("Brand not found");
    const products = await ProductModel.find({ brandId: brandId }).select('name')
    SuccessResponse(res, {message: "Products list", products});
}

// get all selections
export const getAllSelections = async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find().select('name');
    const accounts = await BankAccountModel.find({ is_default: true}).select('name');
    const taxes = await TaxesModel.find().select('name');
    const discounts = await DiscountModel.find().select('name');
    const coupons = await CouponModel.find().select('coupon_code');
    const giftCards = await GiftCardModel.find().select('code amount');
    const paymentMethods = await PaymentMethodModel.find({ isActive: true }).select('name');
    const customers = await CustomerModel.find().select('name');
    const customerGroups = await CustomerGroupModel.find().select('name');
    SuccessResponse(res, {message: "Selections list", warehouses, accounts, taxes, discounts, coupons, giftCards, paymentMethods, customers, customerGroups});
}


// get featured product
export const getFeaturedProducts = async (req: Request, res: Response) => {
    const products = await ProductModel.find({ is_featured: true }).select('name price image ar-name');
    SuccessResponse(res, {message: "Featured products", products});
}
