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
import { BadRequest } from "../../../Errors/BadRequest";
import { Product_WarehouseModel } from "../../../models/schema/admin/Product_Warehouse";
// get all category 
export const getAllCategorys = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // هات الـ Products الموجودة في المخزن ده
  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  // هات الـ Categories اللي فيها منتجات في المخزن ده
  const products = await ProductModel.find({
    _id: { $in: productIds },
  }).select("categoryId");

  const categoryIds = [...new Set(products.map((p) => p.categoryId?.toString()).filter(Boolean))];

  const categories = await CategoryModel.find({
    _id: { $in: categoryIds },
  });

  SuccessResponse(res, { message: "Category list", categories });
};

// ═══════════════════════════════════════════════════════════
// Get All Brands (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getAllBrands = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // هات الـ Products الموجودة في المخزن ده
  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  // هات الـ Brands اللي فيها منتجات في المخزن ده
  const products = await ProductModel.find({
    _id: { $in: productIds },
  }).select("brandId");

  const brandIds = [...new Set(products.map((p) => p.brandId?.toString()).filter(Boolean))];

  const brands = await BrandModel.find({
    _id: { $in: brandIds },
  });

  SuccessResponse(res, { message: "Brand list", brands });
};

// ═══════════════════════════════════════════════════════════
// Get Products By Category (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getProductsByCategory = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { categoryId } = req.params;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const category = await CategoryModel.findById(categoryId);
  if (!category) throw new NotFound("Category not found");

  const products = await buildProductsWithVariations({
    filter: { categoryId },
    warehouseId,
  });

  SuccessResponse(res, {
    message: "Products list by category",
    products,
  });
};

// ═══════════════════════════════════════════════════════════
// Get Products By Brand (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getProductsByBrand = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { brandId } = req.params;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const brand = await BrandModel.findById(brandId);
  if (!brand) throw new NotFound("Brand not found");

  const products = await buildProductsWithVariations({
    filter: { brandId },
    warehouseId,
  });

  SuccessResponse(res, {
    message: "Products list by brand",
    products,
  });
};

// ═══════════════════════════════════════════════════════════
// Get Featured Products (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
export const getFeaturedProducts = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const products = await buildProductsWithVariations({
    filter: { is_featured: true },
    warehouseId,
  });

  SuccessResponse(res, {
    message: "Featured products",
    products,
  });
};


// get all selections
export const getAllSelections = async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find().select('name');
    const accounts = await BankAccountModel.find({in_POS: true, status: true}).select('name balance warhouseId');
    const taxes = await TaxesModel.find().select('name status amount type'); 
    const discounts = await DiscountModel.find().select('name status amount type');
    const coupons = await CouponModel.find().select('coupon_code amount type minimum_amount quantity available expired_date');
    const giftCards = await GiftCardModel.find().select('code amount');
    const paymentMethods = await PaymentMethodModel.find({ isActive: true }).select('name');
    const customers = await CustomerModel.find().select('name phone_number email address');
    const customerGroups = await CustomerGroupModel.find().select('name ');
    const dueCustomers = await CustomerModel.find({ is_Due: true }).select('name phone_number email address amount_Due');
    const currency=await CurrencyModel.find({isdefault: true}).select('name  ar_name,amount');
 const countries = await CountryModel.find()
  .select("name ar_name")                    
  .populate({
    path: "cities",
    select: "name ar_name shipingCost",    // الحقول اللي ترجع من الـ City
  });

    SuccessResponse(res, {message: "Selections list",dueCustomers,countries ,warehouses, currency,accounts, taxes, discounts, coupons, giftCards, paymentMethods, customers, customerGroups});
}




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
  const warehouseId = req.user?.warehouse_id;
  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  const cashiers = await CashierModel.find({
    warehouse_id: warehouseId,
    status: true,          // لسه موجود في السيستم
    cashier_active: false, // مش حد عامل بيه شيفت دلوقتي
  })
    .populate("warehouse_id", "name")
    .lean();

 
  SuccessResponse(res, {
    cashiers,
  });
};


export const selectCashier = async (req: Request, res: Response) => {
  const warehouseId = (req.user as any)?.warehouse_id; // من الـ JWT

  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  const { cashier_id } = req.body;
  if (!cashier_id) {
    throw new BadRequest("Cashier ID is required");
  }

  // ✅ نجيب كاشير مش شغال حاليًا في نفس الـ warehouse
  //   بس من غير ما نعدّل cashier_active هنا
  const cashier = await CashierModel.findOne({
    _id: cashier_id,
    warehouse_id: warehouseId,
    status: true,
    cashier_active: false, // نتأكد إنه مش مستخدم في شيفت تاني
  })
    .populate("warehouse_id", "name")
    .lean();

  if (!cashier) {
    throw new NotFound("Cashier not found or already in use");
  }

  // ✅ كل الفايننشيال أكاونتس بتاعة نفس الـ warehouse:
  //    - شغّالة (status = true)
  //    - ظاهرة في الـ POS (in_POS = true)
  const financialAccounts = await BankAccountModel.find({
    warehouseId: warehouseId, // من السكيمة: warehouseId
    status: true,
    in_POS: true,
  })
    .select("_id name image balance description status in_POS warehouseId")
    .lean();

  return SuccessResponse(res, {
    message: "Cashier selected successfully",
    cashier,
    financialAccounts, // دي اللي تظهر في شاشة الـ POS
  });
};
