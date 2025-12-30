// controllers/StockController.ts
import { Request, Response } from "express";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";
import { ProductPriceModel, ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import mongoose from "mongoose";

// ==================== إضافة منتج لمخزن (مع دعم الـ Variations) ====================
export const addProductToWarehouse = async (req: Request, res: Response) => {
  const { productId, productPriceId, warehouseId, quantity, low_stock } = req.body;

  if (!productId) throw new BadRequest("Product ID is required");
  if (!warehouseId) throw new BadRequest("Warehouse ID is required");

  const product = await ProductModel.findById(productId);
  if (!product) throw new NotFound("Product not found");

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  // ✅ لو فيه productPriceId، نتحقق منه
  if (productPriceId) {
    const productPrice = await ProductPriceModel.findById(productPriceId);
    if (!productPrice) throw new NotFound("Product variation not found");

    // التأكد من أن الـ variation تابع للمنتج الصحيح
    if (productPrice.productId.toString() !== productId) {
      throw new BadRequest("Product variation does not belong to this product");
    }
  }

  // ✅ بناء query للبحث عن المنتج/الـ variation في المخزن
  const existingQuery: any = { productId, warehouseId };
  if (productPriceId) {
    existingQuery.productPriceId = productPriceId;
  } else {
    existingQuery.productPriceId = null;
  }

  const existingStock = await Product_WarehouseModel.findOne(existingQuery);
  if (existingStock) {
    const variationText = productPriceId ? " (this variation)" : "";
    throw new BadRequest(`Product${variationText} already exists in this warehouse`);
  }

  const stock = await Product_WarehouseModel.create({
    productId,
    productPriceId: productPriceId || null,
    warehouseId,
    quantity: quantity || 0,
    low_stock: low_stock || 0,
  });

  await WarehouseModel.findByIdAndUpdate(warehouseId, {
    $inc: {
      number_of_products: 1,
      stock_Quantity: quantity || 0,
    },
  });

  // populate للـ response
  const populatedStock = await Product_WarehouseModel.findById(stock._id)
    .populate("productId", "name ar_name image price")
    .populate("productPriceId", "price code")
    .populate("warehouseId", "name address");

  SuccessResponse(res, {
    message: "Product added to warehouse successfully",
    stock: populatedStock,
  });
};

// ==================== تحديث كمية منتج في مخزن (مع دعم الـ Variations) ====================
export const updateProductStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productId, productPriceId, low_stock } = req.body;

  if (!id) throw new BadRequest("Stock ID is required");

  const stock = await Product_WarehouseModel.findById(id);
  if (!stock) throw new NotFound("Stock not found");

  // ✅ لو بيغير الـ Product
  if (productId && productId !== stock.productId.toString()) {
    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFound("Product not found");

    // بناء query للتحقق من وجود المنتج/الـ variation في نفس المخزن
    const existingQuery: any = {
      productId: productId,
      warehouseId: stock.warehouseId,
      _id: { $ne: id },
    };

    // لو فيه productPriceId جديد
    if (productPriceId !== undefined) {
      existingQuery.productPriceId = productPriceId || null;
    } else {
      existingQuery.productPriceId = stock.productPriceId;
    }

    const existing = await Product_WarehouseModel.findOne(existingQuery);
    if (existing) throw new BadRequest("Product already exists in this warehouse");

    stock.productId = productId;
  }

  // ✅ لو بيغير الـ Variation
  if (productPriceId !== undefined) {
    if (productPriceId) {
      const productPrice = await ProductPriceModel.findById(productPriceId);
      if (!productPrice) throw new NotFound("Product variation not found");

      if (productPrice.productId.toString() !== stock.productId.toString()) {
        throw new BadRequest("Product variation does not belong to this product");
      }
    }
    (stock as any).productPriceId = productPriceId || null;
  }

  // ✅ تحديث الـ low_stock
  if (low_stock !== undefined) {
    stock.low_stock = low_stock;
  }

  await stock.save();

  const updatedStock = await Product_WarehouseModel.findById(id)
    .populate("productId", "name ar_name image price")
    .populate("productPriceId", "price code")
    .populate("warehouseId", "name address");

  SuccessResponse(res, {
    message: "Stock updated successfully",
    stock: updatedStock,
  });
};

// ==================== حذف منتج من مخزن (مع دعم الـ Variations) ====================
export const removeProductFromWarehouse = async (req: Request, res: Response) => {
  const { productId, productPriceId, warehouseId } = req.body;

  if (!productId) throw new BadRequest("Product ID is required");
  if (!warehouseId) throw new BadRequest("Warehouse ID is required");

  // بناء query للحذف
  const deleteQuery: any = { productId, warehouseId };
  if (productPriceId) {
    deleteQuery.productPriceId = productPriceId;
  } else {
    deleteQuery.productPriceId = null;
  }

  const stock = await Product_WarehouseModel.findOneAndDelete(deleteQuery);
  if (!stock) {
    const variationText = productPriceId ? " (this variation)" : "";
    throw new NotFound(`Product${variationText} not found in this warehouse`);
  }

  await WarehouseModel.findByIdAndUpdate(warehouseId, {
    $inc: {
      number_of_products: -1,
      stock_Quantity: -stock.quantity,
    },
  });

  SuccessResponse(res, {
    message: "Product removed from warehouse successfully",
  });
};

// ==================== جلب منتجات مخزن معين (مع دعم الـ Variations) ====================
export const getWarehouseProducts = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const stocks = await Product_WarehouseModel.find({ warehouseId })
    .populate({
      path: "productId",
      populate: [{ path: "categoryId" }, { path: "brandId" }],
    })
    .populate("productPriceId", "price code quantity")
    .lean();

  const products = await Promise.all(
    stocks.map(async (stock: any) => {
      // لو مفيش productId
      if (!stock.productId) return null;

      // هات الـ Options للـ variation لو موجود
      let variationOptions: any[] = [];
      if (stock.productPriceId) {
        const priceOptions = await ProductPriceOptionModel.find({
          product_price_id: stock.productPriceId._id,
        }).lean();

        variationOptions = await Promise.all(
          priceOptions.map(async (po: any) => {
            if (!po.option_id) return null;
            const option = await mongoose.model("Option").findById(po.option_id)
              .populate("variationId", "name ar_name")
              .lean();
            return option;
          })
        );
        variationOptions = variationOptions.filter((o) => o !== null);
      }

      // هات كل الـ Prices للمنتج (لو محتاج تعرضهم)
      const prices = await ProductPriceModel.find({
        productId: stock.productId._id,
      }).lean();

      const pricesWithOptions = await Promise.all(
        prices.map(async (price: any) => {
          const priceOptions = await ProductPriceOptionModel.find({
            product_price_id: price._id,
          }).lean();

          const optionsWithDetails = await Promise.all(
            priceOptions.map(async (po: any) => {
              if (!po.option_id) return null;
              const option = await mongoose.model("Option").findById(po.option_id)
                .populate("variationId", "name ar_name")
                .lean();
              return option;
            })
          );

          const validOptions = optionsWithDetails.filter((o) => o !== null);

          return {
            ...price,
            options: validOptions,
          };
        })
      );

      return {
        ...stock.productId,
        quantity: stock.quantity,
        low_stock: stock.low_stock,
        stockId: stock._id,
        productPriceId: stock.productPriceId,  // الـ variation المحدد
        variationOptions,  // الـ options بتاعة الـ variation
        prices: pricesWithOptions,  // كل الـ prices المتاحة
      };
    })
  );

  // فلتر الـ null products
  const validProducts = products.filter((p) => p !== null);

  SuccessResponse(res, {
    warehouse,
    products: validProducts,
    totalProducts: validProducts.length,
  });
};

// ==================== نقل كمية بين مخزنين (مع دعم الـ Variations) ====================
export const transferStock = async (req: Request, res: Response) => {
  const { productId, productPriceId, fromWarehouseId, toWarehouseId, quantity } = req.body;

  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
    throw new BadRequest("productId, fromWarehouseId, toWarehouseId, and quantity are required");
  }

  if (quantity <= 0) throw new BadRequest("Quantity must be positive");
  if (fromWarehouseId === toWarehouseId) {
    throw new BadRequest("Source and destination warehouses must be different");
  }

  // ✅ لو فيه productPriceId، نتحقق منه
  if (productPriceId) {
    const productPrice = await ProductPriceModel.findById(productPriceId);
    if (!productPrice) throw new NotFound("Product variation not found");
    if (productPrice.productId.toString() !== productId) {
      throw new BadRequest("Product variation does not belong to this product");
    }
  }

  // بناء query المصدر
  const fromQuery: any = {
    productId,
    warehouseId: fromWarehouseId,
  };
  if (productPriceId) {
    fromQuery.productPriceId = productPriceId;
  } else {
    fromQuery.productPriceId = null;
  }

  const fromStock = await Product_WarehouseModel.findOne(fromQuery);
  if (!fromStock) {
    const variationText = productPriceId ? " (this variation)" : "";
    throw new NotFound(`Product${variationText} not found in source warehouse`);
  }
  if (fromStock.quantity < quantity) {
    throw new BadRequest(`Insufficient quantity in source warehouse. Available: ${fromStock.quantity}, Requested: ${quantity}`);
  }

  // بناء query الوجهة
  const toQuery: any = {
    productId,
    warehouseId: toWarehouseId,
  };
  if (productPriceId) {
    toQuery.productPriceId = productPriceId;
  } else {
    toQuery.productPriceId = null;
  }

  let toStock = await Product_WarehouseModel.findOne(toQuery);

  if (!toStock) {
    toStock = await Product_WarehouseModel.create({
      productId,
      productPriceId: productPriceId || null,
      warehouseId: toWarehouseId,
      quantity: 0,
      low_stock: fromStock.low_stock,
    });

    await WarehouseModel.findByIdAndUpdate(toWarehouseId, {
      $inc: { number_of_products: 1 },
    });
  }

  fromStock.quantity -= quantity;
  toStock.quantity += quantity;

  await fromStock.save();
  await toStock.save();

  await WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
    $inc: { stock_Quantity: -quantity },
  });
  await WarehouseModel.findByIdAndUpdate(toWarehouseId, {
    $inc: { stock_Quantity: quantity },
  });

  // Populate للـ response
  const populatedFromStock = await Product_WarehouseModel.findById(fromStock._id)
    .populate("productId", "name ar_name")
    .populate("productPriceId", "price code");
  const populatedToStock = await Product_WarehouseModel.findById(toStock._id)
    .populate("productId", "name ar_name")
    .populate("productPriceId", "price code");

  SuccessResponse(res, {
    message: "Stock transferred successfully",
    fromStock: populatedFromStock,
    toStock: populatedToStock,
  });
};

// ==================== جلب كل الـ Stocks (مع دعم الـ Variations) ====================
export const getAllStocks = async (req: Request, res: Response) => {
  const stocks = await Product_WarehouseModel.find()
    .populate("productId", "name ar_name code price image")
    .populate("productPriceId", "price code")
    .populate("warehouseId", "name address")
    .lean();

  SuccessResponse(res, { stocks });
};

// ==================== جلب المنتجات اللي كميتها قليلة (مع دعم الـ Variations) ====================
export const getLowStockProducts = async (req: Request, res: Response) => {
  const { warehouseId } = req.query;

  const filter: any = {
    $expr: { $lte: ["$quantity", "$low_stock"] },
  };

  if (warehouseId) {
    filter.warehouseId = warehouseId;
  }

  const lowStocks = await Product_WarehouseModel.find(filter)
    .populate("productId", "name ar_name code price image")
    .populate("productPriceId", "price code")
    .populate("warehouseId", "name address")
    .lean();

  // تنسيق البيانات
  const formattedProducts = lowStocks.map((stock: any) => ({
    _id: stock._id,
    product: stock.productId,
    productVariation: stock.productPriceId,  // ✅ إضافة الـ variation
    warehouse: stock.warehouseId,
    currentQuantity: stock.quantity,
    lowStockThreshold: stock.low_stock,
    shortage: stock.low_stock - stock.quantity,
    status: stock.quantity === 0 ? "Out of Stock" : "Low Stock",
  }));

  SuccessResponse(res, {
    message: "Low stock products",
    count: formattedProducts.length,
    products: formattedProducts,
  });
};
