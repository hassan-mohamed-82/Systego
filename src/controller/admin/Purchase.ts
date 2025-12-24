import { Request, Response } from "express";
import { PurchaseModel } from "../../models/schema/admin/Purchase";
import { PurchaseItemModel } from "../../models/schema/admin/purchase_item";
import { PurchaseDuePaymentModel } from "../../models/schema/admin/purchase_due_payment";
import { PurchaseItemOptionModel } from "../../models/schema/admin/purchase_item_option";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { PurchaseInvoiceModel } from "../../models/schema/admin/PurchaseInvoice";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { SupplierModel } from "../../models/schema/admin/suppliers";
import { CurrencyModel } from "../../models/schema/admin/Currency";
import { TaxesModel } from "../../models/schema/admin/Taxes";
import { CategoryModel } from "../../models/schema/admin/category";
import { ProductModel } from "../../models/schema/admin/products";
import { VariationModel } from "../../models/schema/admin/Variation";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { ProductPriceModel } from "../../models/schema/admin/product_price";

import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import {generateBarcodeImage,generateEAN13Barcode} from "../../utils/barcode"
import { any } from "joi";
import { MaterialModel } from "../../models/schema/admin/Materials";

export const createPurchase = async (req: Request, res: Response) => {
  const {
    date,
    warehouse_id,
    supplier_id,
    receipt_img,
    payment_status,
    exchange_rate,
    subtotal,
    shiping_cost,
    discount,
    tax_id,
    purchase_items = [],
    purchase_materials = [],
    financials,
    purchase_due_payment,
  } = req.body;

  // ========== Validations ==========
  const existingWarehouse = await WarehouseModel.findById(warehouse_id);
  if (!existingWarehouse) throw new BadRequest("Warehouse not found");

  const existingSupplier = await SupplierModel.findById(supplier_id);
  if (!existingSupplier) throw new BadRequest("Supplier not found");

  if (tax_id) {
    const existingTax = await TaxesModel.findById(tax_id);
    if (!existingTax) throw new BadRequest("Tax not found");
  }

  // ========== Save Image ==========
  let imageUrl = receipt_img;
  if (receipt_img && receipt_img.startsWith("data:")) {
    imageUrl = await saveBase64Image(receipt_img, Date.now().toString(), req, "Purchases");
  }

  // ========== Create Purchase ==========
  const purchase = await PurchaseModel.create({
    date,
    warehouse_id,
    supplier_id,
    receipt_img: imageUrl,
    payment_status,
    exchange_rate,
    subtotal,
    shiping_cost,
    discount,
    tax_id,
  });

  let warehouse = await WarehouseModel.findById(warehouse_id);

  // ========== Process Products ==========
  for (const p of purchase_items) {
    let product_code = p.product_code;
    let category_id = p.category_id;
    let product_id = p.product_id;

    if (product_code) {
      const product_price = await ProductPriceModel.findOne({ code: product_code }).populate("productId");
      if (product_price) {
        const productDoc: any = product_price.productId;
        product_id = productDoc?._id;
        category_id = productDoc?.categoryId;
      }
    }

    const product = await ProductModel.findById(product_id);
    if (!product) throw new NotFound(`Product not found: ${product_id}`);

    // التحقق من تاريخ الانتهاء
    if (product.exp_ability) {
      if (!p.date_of_expiery) {
        throw new BadRequest(`Expiry date is required for product: ${product.name}`);
      }
      const expiryDate = new Date(p.date_of_expiery);
      const today = new Date();
      expiryDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new BadRequest(`Expiry date cannot be in the past for product: ${product.name}`);
      }
    }

    const existingPurchaseItem = await PurchaseItemModel.findOne({ warehouse_id, product_id });
    if (!existingPurchaseItem && warehouse) {
      warehouse.number_of_products += 1;
      await warehouse.save();
    }

    const purchaseItem = await PurchaseItemModel.create({
      date: p.date,
      warehouse_id,
      purchase_id: purchase._id,
      category_id,
      product_id,
      patch_number: p.patch_number,
      quantity: p.quantity,
      unit_cost: p.unit_cost,
      discount: p.discount,
      tax: p.tax,
      subtotal: p.subtotal,
      item_type: "product",
      date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
    });

    // Update product quantity
    product.quantity += p.quantity ?? 0;
    await product.save();

    // Update category
    const category = await CategoryModel.findById(product.categoryId);
    if (category) {
      category.product_quantity += p.quantity ?? 0;
      await category.save();
    }

    // Update warehouse
    if (warehouse) {
      warehouse.stock_Quantity += p.quantity ?? 0;
      await warehouse.save();
    }

    // Update product-warehouse
    let productWarehouse = await Product_WarehouseModel.findOne({
      productId: product_id,
      WarehouseId: warehouse_id,
    });

    if (productWarehouse) {
      productWarehouse.quantity += p.quantity ?? 0;
      await productWarehouse.save();
    } else {
      await Product_WarehouseModel.create({
        productId: product_id,
        WarehouseId: warehouse_id,
        quantity: p.quantity ?? 0,
      });
    }

    // Create options
    if (p.options && Array.isArray(p.options)) {
      for (const opt of p.options) {
        await PurchaseItemOptionModel.create({
          purchase_item_id: purchaseItem._id,
          option_id: opt.id || opt.option_id,
        });
      }
    }
  }

  // ========== Process Materials ==========
  for (const m of purchase_materials) {
    const material = await MaterialModel.findById(m.material_id);
    if (!material) throw new NotFound(`Material not found: ${m.material_id}`);

    await PurchaseItemModel.create({
      date: m.date || date,
      warehouse_id,
      purchase_id: purchase._id,
      category_id: material.category_id,
      material_id: m.material_id,
      patch_number: m.patch_number,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      discount: m.discount || 0,
      tax: m.tax || 0,
      subtotal: m.subtotal,
      item_type: "material",
    });

    material.quantity += m.quantity ?? 0;
    await material.save();

    if (warehouse) {
      warehouse.stock_Quantity += m.quantity ?? 0;
      await warehouse.save();
    }
  }

  // ========== Create Invoices ==========
  if (financials && Array.isArray(financials)) {
    for (const ele of financials) {
      await PurchaseInvoiceModel.create({
        financial_id: ele.financial_id,
        amount: ele.payment_amount,
        purchase_id: purchase._id,
      });

      const financial = await BankAccountModel.findById(ele.financial_id);
      if (financial) {
        financial.balance -= ele.payment_amount;
        await financial.save();
      }
    }
  }

  // ========== Create Due Payments ==========
  if (purchase_due_payment && Array.isArray(purchase_due_payment)) {
    for (const due_payment of purchase_due_payment) {
      await PurchaseDuePaymentModel.create({
        purchase_id: purchase._id,
        amount: due_payment.amount,
        date: due_payment.date,
      });
    }
  }

  SuccessResponse(res, { message: "Purchase created successfully", purchase });
};

export const getPurchases = async (req: Request, res: Response): Promise<void> => {
  const [
    purchases,
    warehouses,
    suppliers,
    taxes,
    financial_account,
    products,
    materials,
    variations,
  ] = await Promise.all([
    PurchaseModel.find()
      .select("_id date shiping_cost discount payment_status subtotal")
      .populate({ path: "warehouse_id", select: "_id name" })
      .populate({ path: "supplier_id", select: "_id username phone_number" })
      .populate({ path: "tax_id", select: "_id name rate" })
      .lean(),

    WarehouseModel.find({ status: true }).select("_id name").lean(),
    SupplierModel.find({ status: true }).select("_id username").lean(),
    TaxesModel.find({ status: true }).select("_id name rate").lean(),
    BankAccountModel.find({ status: true }).select("_id name balance").lean(),
    ProductModel.find().select("_id name ar_name exp_ability code price").lean(),
    MaterialModel.find().select("_id name ar_name unit quantity").lean(),
    VariationModel.find({ status: true })
      .select("_id name")
      .populate({ path: "options", select: "_id name", match: { status: true } })
      .lean(),
  ]);

  SuccessResponse(res, {
    purchases,
    warehouses,
    suppliers,
    taxes,
    financial_account,
    products,
    materials,
    variations,
  });
};

export const getPurchaseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const baseUrl = req.protocol + "://" + req.get("host");

  const purchase = await PurchaseModel.findById(id)
    .populate({ path: "warehouse_id", select: "_id name" })
    .populate({ path: "supplier_id", select: "_id username phone_number" })
    .populate({ path: "tax_id", select: "_id name rate" })
    .lean({ virtuals: true });

  if (!purchase) throw new NotFound("Purchase not found");

  // Get items with populated data
  const items = await PurchaseItemModel.find({ purchase_id: id })
    .populate({ path: "product_id", select: "_id name ar_name code price" })
    .populate({ path: "material_id", select: "_id name ar_name" })
    .populate({ path: "category_id", select: "_id name" })
    .lean({ virtuals: true });

  // Separate products and materials
  const products = items.filter(item => item.item_type === "product");
  const materials = items.filter(item => item.item_type === "material");

  // Get options for each product item
  for (const product of products) {
    const options = await PurchaseItemOptionModel.find({ purchase_item_id: product._id })
      .populate({ path: "option_id", select: "_id name" })
      .lean();
    (product as any).options = options;
  }

  // Get invoices
  const invoices = await PurchaseInvoiceModel.find({ purchase_id: id })
    .populate({ path: "financial_id", select: "_id name" })
    .lean();

  // Get due payments
  const duePayments = await PurchaseDuePaymentModel.find({ purchase_id: id }).lean();

  // Fix image URL
  if (purchase?.receipt_img) {
    purchase.receipt_img = `${baseUrl}/${purchase.receipt_img}`;
  }

  SuccessResponse(res, {
    purchase: {
      ...purchase,
      products,
      materials,
      invoices,
      duePayments,
    },
  });
};

export const updatePurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    date,
    warehouse_id,
    supplier_id,
    receipt_img,
    shiping_cost,
    discount,
    tax_id,
    exchange_rate,
    payment_status,
    subtotal,
    purchase_items,
    purchase_materials,
  } = req.body;

  const purchase = await PurchaseModel.findById(id);
  if (!purchase) throw new NotFound("Purchase not found");

  // Update image
  if (receipt_img && receipt_img.startsWith("data:")) {
    purchase.receipt_img = await saveBase64Image(receipt_img, Date.now().toString(), req, "Purchases");
  } else if (receipt_img) {
    purchase.receipt_img = receipt_img;
  }

  // Update fields
  if (date !== undefined) purchase.date = date;
  if (warehouse_id !== undefined) purchase.warehouse_id = warehouse_id;
  if (supplier_id !== undefined) purchase.supplier_id = supplier_id;
  if (exchange_rate !== undefined) purchase.exchange_rate = exchange_rate;
  if (shiping_cost !== undefined) purchase.shiping_cost = shiping_cost;
  if (discount !== undefined) purchase.discount = discount;
  if (tax_id !== undefined) purchase.tax_id = tax_id;
  if (payment_status !== undefined) purchase.payment_status = payment_status;
  if (subtotal !== undefined) purchase.subtotal = subtotal;

  await purchase.save();

  // ========== Update Products ==========
  if (purchase_items && Array.isArray(purchase_items)) {
    for (const p of purchase_items) {
      if (p._id) {
        // Update existing item
        const purchaseItem = await PurchaseItemModel.findById(p._id);
        if (purchaseItem && purchaseItem.item_type === "product") {
          const product = await ProductModel.findById(purchaseItem.product_id);

          if (product?.exp_ability && p.date_of_expiery) {
            const expiryDate = new Date(p.date_of_expiery);
            const today = new Date();
            expiryDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            if (expiryDate < today) {
              throw new BadRequest(`Expiry date cannot be in the past for product: ${product.name}`);
            }
          }

          if (product && p.quantity !== undefined) {
            const diff = p.quantity - purchaseItem.quantity;
            product.quantity = (product.quantity ?? 0) + diff;
            await product.save();

            const category = await CategoryModel.findById(product.categoryId);
            if (category) {
              category.product_quantity += diff;
              await category.save();
            }

            const productWarehouse = await Product_WarehouseModel.findOne({
              productId: purchaseItem.product_id,
              WarehouseId: purchase.warehouse_id,
            });
            if (productWarehouse) {
              productWarehouse.quantity += diff;
              await productWarehouse.save();
            }

            const warehouse = await WarehouseModel.findById(purchase.warehouse_id);
            if (warehouse) {
              warehouse.stock_Quantity += diff;
              await warehouse.save();
            }
          }

          if (p.date !== undefined) purchaseItem.date = p.date;
          if (p.quantity !== undefined) purchaseItem.quantity = p.quantity;
          if (p.unit_cost !== undefined) purchaseItem.unit_cost = p.unit_cost;
          if (p.tax !== undefined) purchaseItem.tax = p.tax;
          if (p.discount !== undefined) purchaseItem.discount = p.discount;
          if (p.subtotal !== undefined) purchaseItem.subtotal = p.subtotal;
          if (p.date_of_expiery !== undefined) purchaseItem.date_of_expiery = p.date_of_expiery;
          if (p.patch_number !== undefined) purchaseItem.patch_number = p.patch_number;

          await purchaseItem.save();
        }
      } else {
        // Create new item
        const product = await ProductModel.findById(p.product_id);
        if (!product) throw new NotFound(`Product not found: ${p.product_id}`);

        if (product.exp_ability && !p.date_of_expiery) {
          throw new BadRequest(`Expiry date is required for product: ${product.name}`);
        }

        const newItem = await PurchaseItemModel.create({
          date: p.date || date,
          warehouse_id: purchase.warehouse_id,
          purchase_id: purchase._id,
          category_id: product.categoryId,
          product_id: p.product_id,
          patch_number: p.patch_number,
          quantity: p.quantity,
          unit_cost: p.unit_cost,
          discount: p.discount || 0,
          tax: p.tax || 0,
          subtotal: p.subtotal,
          item_type: "product",
          date_of_expiery: product.exp_ability ? p.date_of_expiery : undefined,
        });

        product.quantity += p.quantity ?? 0;
        await product.save();

        const warehouse = await WarehouseModel.findById(purchase.warehouse_id);
        if (warehouse) {
          warehouse.stock_Quantity += p.quantity ?? 0;
          await warehouse.save();
        }

        // Create options
        if (p.options && Array.isArray(p.options)) {
          for (const opt of p.options) {
            await PurchaseItemOptionModel.create({
              purchase_item_id: newItem._id,
              option_id: opt.id || opt.option_id,
            });
          }
        }
      }
    }
  }

  // ========== Update Materials ==========
  if (purchase_materials && Array.isArray(purchase_materials)) {
    for (const m of purchase_materials) {
      if (m._id) {
        // Update existing
        const purchaseItem = await PurchaseItemModel.findById(m._id);
        if (purchaseItem && purchaseItem.item_type === "material") {
          const material = await MaterialModel.findById(purchaseItem.material_id);

          if (material && m.quantity !== undefined) {
            const diff = m.quantity - purchaseItem.quantity;
            material.quantity += diff;
            await material.save();

            const warehouse = await WarehouseModel.findById(purchase.warehouse_id);
            if (warehouse) {
              warehouse.stock_Quantity += diff;
              await warehouse.save();
            }
          }

          if (m.date !== undefined) purchaseItem.date = m.date;
          if (m.quantity !== undefined) purchaseItem.quantity = m.quantity;
          if (m.unit_cost !== undefined) purchaseItem.unit_cost = m.unit_cost;
          if (m.tax !== undefined) purchaseItem.tax = m.tax;
          if (m.discount !== undefined) purchaseItem.discount = m.discount;
          if (m.subtotal !== undefined) purchaseItem.subtotal = m.subtotal;

          await purchaseItem.save();
        }
      } else {
        // Create new
        const material = await MaterialModel.findById(m.material_id);
        if (!material) throw new NotFound(`Material not found: ${m.material_id}`);

        await PurchaseItemModel.create({
          date: m.date || date,
          warehouse_id: purchase.warehouse_id,
          purchase_id: purchase._id,
          category_id: material.category_id,
          material_id: m.material_id,
          patch_number: m.patch_number,
          quantity: m.quantity,
          unit_cost: m.unit_cost,
          discount: m.discount || 0,
          tax: m.tax || 0,
          subtotal: m.subtotal,
          item_type: "material",
        });

        material.quantity += m.quantity ?? 0;
        await material.save();

        const warehouse = await WarehouseModel.findById(purchase.warehouse_id);
        if (warehouse) {
          warehouse.stock_Quantity += m.quantity ?? 0;
          await warehouse.save();
        }
      }
    }
  }

  SuccessResponse(res, { message: "Purchase updated successfully", purchase });
};


export const getLowStockProducts = async (req: Request, res: Response) => {
  const products = await ProductModel.find({
    $expr: { $lte: ["$quantity", "$low_stock"] }
  })
  .select("name ar_name code quantity low_stock image")
  .populate("categoryId", "name ar_name")
  .populate("brandId", "name ar_name");

  // تنسيق الـ response
  const formattedProducts = products.map(product => ({
    _id: product._id,
    name: product.name,
    ar_name: product.ar_name,
    code: product.code,
    image: product.image,
    actual_stock: product.quantity,
    minimum_stock: product.low_stock ?? 0,
    shortage: (product.low_stock ?? 0) - (product.quantity ?? 0),  // الفرق
    category: product.categoryId,
    brand: product.brandId
  }));

  SuccessResponse(res, { 
    message: "Low stock products retrieved successfully",
    count: formattedProducts.length,
    products: formattedProducts 
  });
};


// المنتجات اللي هتنتهي قريباً (خلال أسبوع)
export const getCriticalExpiryProducts = async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  const criticalItems = await PurchaseItemModel.find({
    item_type: "product",
    date_of_expiery: { 
      $exists: true, 
      $ne: null, 
      $gte: today,
      $lte: nextWeek 
    },
    quantity: { $gt: 0 }
  })
  .populate({
    path: "product_id",
    select: "name ar_name code image"
  })
  .populate({
    path: "warehouse_id",
    select: "name"
  })
  .select("product_id warehouse_id quantity date_of_expiery patch_number")
  .sort({ date_of_expiery: 1 });

  const formattedProducts = criticalItems.map(item => {
    const expiryDate = new Date(item.date_of_expiery!);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      _id: item._id,
      product: item.product_id,
      warehouse: item.warehouse_id,
      quantity: item.quantity,
      patch_number: item.patch_number,
      expiry_date: item.date_of_expiery,
      days_remaining: diffDays
    };
  });

  SuccessResponse(res, {
    message: "Critical expiry products retrieved successfully",
    count: formattedProducts.length,
    products: formattedProducts
  });
};

export const getExpiringProducts = async (req: Request, res: Response) => {
  const { days = 30 } = req.query; // افتراضياً هيجيب اللي هتنتهي خلال 30 يوم

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Number(days));
  futureDate.setHours(23, 59, 59, 999);

  // جيب الـ PurchaseItems اللي عندها تاريخ انتهاء
  const expiringItems = await PurchaseItemModel.find({
    item_type: "product",
    date_of_expiery: { $exists: true, $ne: null, $lte: futureDate }
  })
  .populate({
    path: "product_id",
    select: "name ar_name code image exp_ability"
  })
  .populate({
    path: "warehouse_id",
    select: "name"
  })
  .select("product_id warehouse_id quantity date_of_expiery patch_number")
  .sort({ date_of_expiery: 1 }); // الأقرب للانتهاء أولاً

  // تنسيق الـ response
  const formattedProducts = expiringItems.map(item => {
    const expiryDate = new Date(item.date_of_expiery!);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: string;
    if (diffDays < 0) {
      status = "expired";
    } else if (diffDays === 0) {
      status = "expires_today";
    } else if (diffDays <= 7) {
      status = "critical";
    } else if (diffDays <= 30) {
      status = "warning";
    } else {
      status = "normal";
    }

    return {
      _id: item._id,
      product: item.product_id,
      warehouse: item.warehouse_id,
      quantity: item.quantity,
      patch_number: item.patch_number,
      expiry_date: item.date_of_expiery,
      days_remaining: diffDays,
      status
    };
  });

  // إحصائيات
  const stats = {
    total: formattedProducts.length,
    expired: formattedProducts.filter(p => p.status === "expired").length,
    expires_today: formattedProducts.filter(p => p.status === "expires_today").length,
    critical: formattedProducts.filter(p => p.status === "critical").length,
    warning: formattedProducts.filter(p => p.status === "warning").length
  };

  SuccessResponse(res, {
    message: "Expiring products retrieved successfully",
    stats,
    products: formattedProducts
  });
};

// المنتجات المنتهية الصلاحية فقط
export const getExpiredProducts = async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredItems = await PurchaseItemModel.find({
    item_type: "product",
    date_of_expiery: { $exists: true, $ne: null, $lt: today },
    quantity: { $gt: 0 } // اللي لسه فيها كمية
  })
  .populate({
    path: "product_id",
    select: "name ar_name code image"
  })
  .populate({
    path: "warehouse_id",
    select: "name"
  })
  .select("product_id warehouse_id quantity date_of_expiery patch_number")
  .sort({ date_of_expiery: 1 });

  const formattedProducts = expiredItems.map(item => {
    const expiryDate = new Date(item.date_of_expiery!);
    const diffTime = today.getTime() - expiryDate.getTime();
    const expiredDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      _id: item._id,
      product: item.product_id,
      warehouse: item.warehouse_id,
      quantity: item.quantity,
      patch_number: item.patch_number,
      expiry_date: item.date_of_expiery,
      expired_since_days: expiredDays
    };
  });

  SuccessResponse(res, {
    message: "Expired products retrieved successfully",
    count: formattedProducts.length,
    products: formattedProducts
  });
};