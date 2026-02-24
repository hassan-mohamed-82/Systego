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

  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  // هات المنتجات مع categoryId
  const products = await ProductModel.find({
    _id: { $in: productIds },
  }).select("categoryId");

  // ✅ categoryId هو Array of ObjectIds
  const categoryIds: string[] = [];
  
  products.forEach((p: any) => {
    if (p.categoryId && p.categoryId.length > 0) {
      p.categoryId.forEach((catId: any) => {
        if (catId) {
          categoryIds.push(catId.toString());
        }
      });
    }
  });

  const uniqueCategoryIds = [...new Set(categoryIds)];

  const category = await CategoryModel.find({
    _id: { $in: uniqueCategoryIds },
  });

  SuccessResponse(res, { message: "Category list", category });
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

  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  const products = await ProductModel.find({
    _id: { $in: productIds },
  }).select("brandId");

  const brandIds: string[] = [];
  products.forEach((p) => {
    if (p.brandId) {
      const id = (p.brandId as any)?._id?.toString() || p.brandId?.toString();
      if (id) brandIds.push(id);
    }
  });

  const uniqueBrandIds = [...new Set(brandIds)];

  const brand = await BrandModel.find({
    _id: { $in: uniqueBrandIds },
  });

  SuccessResponse(res, { message: "Brand list", brand });
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

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId quantity");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  // ✅ categoryId هو Array عشان كده نستخدم $in
  const products = await ProductModel.find({
    _id: { $in: productIds },
    categoryId: { $in: [categoryId] },
  })
    .populate("categoryId", "name ar_name")
    .populate("brandId", "name ar_name")
    .lean();

  // إضافة الكمية من المخزن والـ Variations
  const result = await Promise.all(
    products.map(async (product) => {
      const warehouseStock = warehouseProducts.find(
        (wp) => wp.productId.toString() === product._id.toString()
      );

      const variations = await ProductPriceModel.find({
        productId: product._id,
      }).lean();

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Products list by category",
    products: result,
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

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId quantity");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  const products = await ProductModel.find({
    _id: { $in: productIds },
    brandId: brandId,
  })
    .populate("categoryId", "name ar_name")
    .populate("brandId", "name ar_name")
    .lean();

  const result = await Promise.all(
    products.map(async (product) => {
      const warehouseStock = warehouseProducts.find(
        (wp) => wp.productId.toString() === product._id.toString()
      );

      const variations = await ProductPriceModel.find({
        productId: product._id,
      }).lean();

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Products list by brand",
    products: result,
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

  // هات المنتجات الموجودة في المخزن
  const warehouseProducts = await Product_WarehouseModel.find({
    warehouseId: warehouseId,
    quantity: { $gt: 0 },
  }).select("productId quantity");

  const productIds = warehouseProducts.map((wp) => wp.productId);

  const products = await ProductModel.find({
    _id: { $in: productIds },
    is_featured: true,
  })
    .populate("categoryId", "name ar_name")
    .populate("brandId", "name ar_name")
    .lean();

  const result = await Promise.all(
    products.map(async (product) => {
      const warehouseStock = warehouseProducts.find(
        (wp) => wp.productId.toString() === product._id.toString()
      );

      const variations = await ProductPriceModel.find({
        productId: product._id,
      }).lean();

      return {
        ...product,
        quantity: warehouseStock?.quantity ?? 0,
        variations,
      };
    })
  );

  SuccessResponse(res, {
    message: "Featured products",
    products: result,
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



export const getActiveBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();

  const bundles = await PandelModel.find({
    status: true,
    startdate: { $lte: currentDate },
    enddate: { $gte: currentDate },
  }).lean();

  const bundlesWithDetails = await Promise.all(
    bundles.map(async (bundle) => {
      let originalPrice = 0;

      const productsDetails = await Promise.all(
        (bundle.products || []).map(async (p: any) => {
          // جلب المنتج
          const product = await ProductModel.findById(p.productId)
            .select("name ar_name image price")
            .lean();

          if (!product) return null;

          // جلب كل الـ Variations للمنتج ده
          const allVariations = await ProductPriceModel.find({
            productId: p.productId,
          })
            .select("price code quantity cost")
            .lean();

          // جلب الـ Options لكل Variation
          const variationsWithOptions = await Promise.all(
            allVariations.map(async (v: any) => {
              const options = await ProductPriceOptionModel.find({
                product_price_id: v._id,
              })
                .populate("option_id", "name ar_name")
                .lean();

              return {
                _id: v._id,
                price: v.price,
                code: v.code,
                quantity: v.quantity,
                options: options.map((o: any) => o.option_id),
              };
            })
          );

          const hasVariations = variationsWithOptions.length > 0;
          const isVariationFixed = !!p.productPriceId;

          let selectedVariation = null;
          let productPrice = product.price || 0;

          // لو الـ Variation محدد من الأدمن
          if (isVariationFixed && p.productPriceId) {
            const fixedVariation = variationsWithOptions.find(
              (v: any) => v._id.toString() === p.productPriceId.toString()
            );
            if (fixedVariation) {
              selectedVariation = fixedVariation;
              productPrice = fixedVariation.price || product.price || 0;
            }
          }

          // حساب السعر الأصلي
          originalPrice += productPrice * (p.quantity || 1);

          return {
            productId: p.productId,
            product: product,
            quantity: p.quantity || 1,

            // معلومات الـ Variations
            hasVariations: hasVariations,
            isVariationFixed: isVariationFixed,
            requiresSelection: hasVariations && !isVariationFixed,

            // لو محدد من الأدمن
            selectedVariation: selectedVariation,
            productPriceId: p.productPriceId || null,

            // لو مفتوح للكاشير
            availableVariations: !isVariationFixed ? variationsWithOptions : [],
          };
        })
      );

      const validProducts = productsDetails.filter((p) => p !== null);

      const savings = originalPrice - bundle.price;
      const savingsPercentage =
        originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

      // هل الـ Bundle يحتاج اختيار من الكاشير؟
      const requiresVariationSelection = validProducts.some(
        (p: any) => p?.requiresSelection
      );

      return {
        _id: bundle._id,
        name: bundle.name,
        images: bundle.images,
        price: bundle.price,
        originalPrice: originalPrice,
        savings: savings > 0 ? savings : 0,
        savingsPercentage: savingsPercentage > 0 ? savingsPercentage : 0,
        startdate: bundle.startdate,
        enddate: bundle.enddate,

        // ✅ الجديد
        requiresVariationSelection: requiresVariationSelection,
        products: validProducts,
      };
    })
  );

  return SuccessResponse(res, {
    message: "Active bundles",
    count: bundlesWithDetails.length,
    bundles: bundlesWithDetails,
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
