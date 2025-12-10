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
import { CurrencyModel } from "../../../models/schema/admin/Currency";
import { get } from "axios";
import { PandelModel } from "../../../models/schema/admin/pandels";
import {buildProductsWithVariations  } from "../../../utils/producthelper";
import { CountryModel } from "../../../models/schema/admin/Country";
import { CityModels } from "../../../models/schema/admin/City";
import { CashierModel } from "../../../models/schema/admin/cashier";
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

  // 🔹 استخدم نفس الـ helper لكن بفلتر الكاتيجوري
  const products = await buildProductsWithVariations({ categoryId });

  SuccessResponse(res, {
    message: "Products list by category",
    products,
  });
};


// get all products by brand 
export const getProductsByBrand = async (req: Request, res: Response) => {
  const { brandId } = req.params;

  const brand = await BrandModel.findById(brandId);
  if (!brand) throw new NotFound("Brand not found");

  const products = await buildProductsWithVariations({ brandId });

  SuccessResponse(res, {
    message: "Products list by brand",
    products,
  });
};


// get all selections
export const getAllSelections = async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find().select('name');
    const accounts = await BankAccountModel.find({in_POS: true, status: true}).select('name balance warhouseId');
    const taxes = await TaxesModel.find().select('name status amount type'); 
    const discounts = await DiscountModel.find().select('name');
    const coupons = await CouponModel.find().select('coupon_code');
    const giftCards = await GiftCardModel.find().select('code amount');
    const paymentMethods = await PaymentMethodModel.find({ isActive: true }).select('name');
    const customers = await CustomerModel.find().select('name');
    const customerGroups = await CustomerGroupModel.find().select('name');
    const currency=await CurrencyModel.find().select('name  ar_name');
 const countries = await CountryModel.find()
  .select("name ar_name")                  // حقول البلد
  .populate({
    path: "cities",
    select: "name ar_name shipingCost",    // الحقول اللي ترجع من الـ City
  });

    SuccessResponse(res, {message: "Selections list",countries ,warehouses, currency,accounts, taxes, discounts, coupons, giftCards, paymentMethods, customers, customerGroups});
}


// get featured product
export const getFeaturedProducts = async (req: Request, res: Response) => {
  const products = await buildProductsWithVariations({ is_featured: true });

  SuccessResponse(res, {
    message: "Featured products",
    products,
  });
};



// get active bundles (pandels) for POS
export const getActiveBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();

  // جلب الـ Bundles النشطة فقط (في نطاق التاريخ)
  const bundles = await PandelModel.find({
    status: true,
    startdate: { $lte: currentDate },
    enddate: { $gte: currentDate },
  }).populate("productsId", "name price image ar_name");

  // حساب السعر الأصلي ونسبة التوفير
  const bundlesWithPricing = bundles.map((bundle) => {
    const products = bundle.productsId as any[];

    // حساب السعر الأصلي (مجموع أسعار المنتجات)
    const originalPrice = products.reduce((sum, product) => {
      return sum + (product.price || 0);
    }, 0);

    // حساب التوفير
    const savings = originalPrice - bundle.price;
    const savingsPercentage =
      originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

    return {
      _id: bundle._id,
      name: bundle.name,
      images: bundle.images,
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        ar_name: p.ar_name,
        price: p.price,
        image: p.image,
      })),
      originalPrice: originalPrice,
      bundlePrice: bundle.price,
      savings: savings,
      savingsPercentage: savingsPercentage,
      startdate: bundle.startdate,
      enddate: bundle.enddate,
    };
  });

  SuccessResponse(res, {
    message: "Active bundles",
    bundles: bundlesWithPricing,
  });
};





export const getCashiers = async (req: Request, res: Response) => {
  const cashiers = await CashierModel.find()
    .populate("warehouse_id", "name") // اسم المخزن
    .populate({
      path: "users",
      select: "username email role status warehouseId", // الحقول اللي محتاجها من User
    })
    .populate({
      path: "bankAccounts",
      select: "name balance status in_POS warehouseId", // الحقول اللي محتاجها من BankAccount
    });

  SuccessResponse(res, {
    message: "Cashiers with their users and bank accounts",
    cashiers,
  });
};