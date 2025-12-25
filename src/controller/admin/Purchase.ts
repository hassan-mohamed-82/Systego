import { Request, Response } from "express";
import { IPurchase, IPurchaseItem, PurchaseModel } from "../../models/schema/admin/Purchase";
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
import { generateBarcodeImage, generateEAN13Barcode } from "../../utils/barcode"
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
    total,
    discount,
    shipping_cost,
    grand_total,
    tax_id,
    purchase_items = [],
    purchase_materials = [],
    financials,
    purchase_due_payment,
    note,
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
    total,
    discount,
    shipping_cost,
    grand_total,
    tax_id,
    note,
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
    if ((product as any).exp_ability) {
      if (!p.date_of_expiery) {
        throw new BadRequest(`Expiry date is required for product: ${(product as any).name}`);
      }
      const expiryDate = new Date(p.date_of_expiery);
      const today = new Date();
      expiryDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new BadRequest(`Expiry date cannot be in the past for product: ${(product as any).name}`);
      }
    }

    const existingPurchaseItem = await PurchaseItemModel.findOne({ warehouse_id, product_id });
    if (!existingPurchaseItem && warehouse) {
      (warehouse as any).number_of_products += 1;
      await warehouse.save();
    }

    const purchaseItem = await PurchaseItemModel.create({
      date: p.date || date,
      warehouse_id,
      purchase_id: purchase._id,
      category_id,
      product_id,
      patch_number: p.patch_number,
      quantity: p.quantity,
      unit_cost: p.unit_cost,
      subtotal: p.subtotal,
      discount_share: p.discount_share || 0,
      unit_cost_after_discount: p.unit_cost_after_discount || p.unit_cost,
      tax: p.tax || 0,
      item_type: "product",
      date_of_expiery: (product as any).exp_ability ? p.date_of_expiery : undefined,
    });

    // Update product quantity
    // Update product quantity
    await ProductModel.findByIdAndUpdate(product._id, { $inc: { quantity: p.quantity ?? 0 } });

    // Update category
    const category = await CategoryModel.findById((product as any).categoryId);
    if (category) {
      (category as any).product_quantity += p.quantity ?? 0;
      await category.save();
    }

    // Update warehouse
    if (warehouse) {
      (warehouse as any).stock_Quantity += p.quantity ?? 0;
      await warehouse.save();
    }

    // Update product-warehouse
    let productWarehouse = await Product_WarehouseModel.findOne({
      productId: product_id,
      warehouseId: warehouse_id,
    });

    if (productWarehouse) {
      (productWarehouse as any).quantity += p.quantity ?? 0;
      await productWarehouse.save();
    } else {
      await Product_WarehouseModel.create({
        productId: product_id,
        warehouseId: warehouse_id,
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
      category_id: (material as any).category_id,
      material_id: m.material_id,
      patch_number: m.patch_number,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      subtotal: m.subtotal,
      discount_share: m.discount_share || 0,
      unit_cost_after_discount: m.unit_cost_after_discount || m.unit_cost,
      tax: m.tax || 0,
      item_type: "material",
    });

    (material as any).quantity += m.quantity ?? 0;
    await material.save();

    if (warehouse) {
      (warehouse as any).stock_Quantity += m.quantity ?? 0;
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
        (financial as any).balance -= ele.payment_amount;
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

  const fullPurchase = await PurchaseModel.findById(purchase._id)
    .populate("items")
    .populate("warehouse_id")
    .populate("supplier_id")
    .populate("tax_id");

  SuccessResponse(res, { message: "Purchase created successfully", purchase: fullPurchase });
};
export const getAllPurchases = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, payment_status, warehouse_id, supplier_id } = req.query;

  const filter: any = {};
  if (payment_status) filter.payment_status = payment_status;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (supplier_id) filter.supplier_id = supplier_id;

  const purchases = await PurchaseModel.find(filter)
    .populate("warehouse_id")
    .populate("supplier_id")
    .populate("tax_id")
    .populate("items")
    .populate("invoices")
    .populate("duePayments")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await PurchaseModel.countDocuments(filter);

  SuccessResponse(res, {
    purchases,
    pagination: {
      current_page: Number(page),
      total_pages: Math.ceil(total / Number(limit)),
      total_items: total,
      per_page: Number(limit),
    },
  });
};
export const getPurchaseById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const purchase = await PurchaseModel.findById(id)
    .populate("warehouse_id")
    .populate("supplier_id")
    .populate("tax_id")
    .populate({
      path: "items",
      populate: [
        { path: "product_id" },
        { path: "material_id" },
        { path: "category_id" },
        { path: "options", populate: { path: "option_id" } },
      ],
    })
    .populate("invoices")
    .populate("duePayments");

  if (!purchase) throw new NotFound("Purchase not found");

  SuccessResponse(res, { purchase });
};

export const updatePurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    date,
    warehouse_id,
    supplier_id,
    receipt_img,
    payment_status,
    exchange_rate,
    total,
    discount,
    shipping_cost,
    grand_total,
    tax_id,
    note,
    purchase_items = [],
    purchase_materials = [],
    financials,
    purchase_due_payment,
  } = req.body;

  const existingPurchase = await PurchaseModel.findById(id);
  if (!existingPurchase) throw new NotFound("Purchase not found");

  // ========== Validations ==========
  if (warehouse_id) {
    const existingWarehouse = await WarehouseModel.findById(warehouse_id);
    if (!existingWarehouse) throw new BadRequest("Warehouse not found");
  }

  if (supplier_id) {
    const existingSupplier = await SupplierModel.findById(supplier_id);
    if (!existingSupplier) throw new BadRequest("Supplier not found");
  }

  if (tax_id) {
    const existingTax = await TaxesModel.findById(tax_id);
    if (!existingTax) throw new BadRequest("Tax not found");
  }

  // ========== Save Image ==========
  let imageUrl = receipt_img;
  if (receipt_img && receipt_img.startsWith("data:")) {
    imageUrl = await saveBase64Image(receipt_img, Date.now().toString(), req, "Purchases");
  }

  // ========== Reverse Old Items ==========
  const oldItems = await PurchaseItemModel.find({ purchase_id: id });

  for (const item of oldItems) {
    const itemData = item as any;

    if (itemData.item_type === "product" && itemData.product_id) {
      const product = await ProductModel.findById(itemData.product_id);
      if (product) {
        await ProductModel.findByIdAndUpdate(product._id, { $inc: { quantity: -itemData.quantity } });
      }

      const category = await CategoryModel.findById(itemData.category_id);
      if (category) {
        (category as any).product_quantity -= itemData.quantity;
        await category.save();
      }

      const productWarehouse = await Product_WarehouseModel.findOne({
        productId: itemData.product_id,
        WarehouseId: itemData.warehouse_id,
      });
      if (productWarehouse) {
        (productWarehouse as any).quantity -= itemData.quantity;
        await productWarehouse.save();
      }
    }

    if (itemData.item_type === "material" && itemData.material_id) {
      const material = await MaterialModel.findById(itemData.material_id);
      if (material) {
        (material as any).quantity -= itemData.quantity;
        await material.save();
      }
    }

    await PurchaseItemOptionModel.deleteMany({ purchase_item_id: itemData._id });
  }

  // Update warehouse stock
  const oldWarehouse = await WarehouseModel.findById((existingPurchase as any).warehouse_id);
  if (oldWarehouse) {
    const totalOldQty = oldItems.reduce((sum, item) => sum + (item as any).quantity, 0);
    (oldWarehouse as any).stock_Quantity -= totalOldQty;
    await oldWarehouse.save();
  }

  // Delete old items
  await PurchaseItemModel.deleteMany({ purchase_id: id });

  // Delete old invoices and restore balance
  const oldInvoices = await PurchaseInvoiceModel.find({ purchase_id: id });
  for (const inv of oldInvoices) {
    const financial = await BankAccountModel.findById((inv as any).financial_id);
    if (financial) {
      (financial as any).balance += (inv as any).amount;
      await financial.save();
    }
  }
  await PurchaseInvoiceModel.deleteMany({ purchase_id: id });

  // Delete old due payments
  await PurchaseDuePaymentModel.deleteMany({ purchase_id: id });

  // ========== Update Purchase ==========
  (existingPurchase as any).date = date ?? (existingPurchase as any).date;
  (existingPurchase as any).warehouse_id = warehouse_id ?? (existingPurchase as any).warehouse_id;
  (existingPurchase as any).supplier_id = supplier_id ?? (existingPurchase as any).supplier_id;
  (existingPurchase as any).receipt_img = imageUrl ?? (existingPurchase as any).receipt_img;
  (existingPurchase as any).payment_status = payment_status ?? (existingPurchase as any).payment_status;
  (existingPurchase as any).exchange_rate = exchange_rate ?? (existingPurchase as any).exchange_rate;
  (existingPurchase as any).total = total ?? (existingPurchase as any).total;
  (existingPurchase as any).discount = discount ?? (existingPurchase as any).discount;
  (existingPurchase as any).shipping_cost = shipping_cost ?? (existingPurchase as any).shipping_cost;
  (existingPurchase as any).grand_total = grand_total ?? (existingPurchase as any).grand_total;
  if (tax_id !== undefined) (existingPurchase as any).tax_id = tax_id;
  if (note !== undefined) (existingPurchase as any).note = note;

  await existingPurchase.save();

  let warehouse = await WarehouseModel.findById((existingPurchase as any).warehouse_id);

  // ========== Process New Products ==========
  for (const p of purchase_items) {
    let category_id = p.category_id;
    let product_id = p.product_id;

    if (p.product_code) {
      const product_price = await ProductPriceModel.findOne({ code: p.product_code }).populate("productId");
      if (product_price) {
        const productDoc: any = product_price.productId;
        product_id = productDoc?._id;
        category_id = productDoc?.categoryId;
      }
    }

    const product = await ProductModel.findById(product_id);
    if (!product) throw new NotFound(`Product not found: ${product_id}`);

    if ((product as any).exp_ability) {
      if (!p.date_of_expiery) {
        throw new BadRequest(`Expiry date is required for product: ${(product as any).name}`);
      }
      const expiryDate = new Date(p.date_of_expiery);
      const today = new Date();
      expiryDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new BadRequest(`Expiry date cannot be in the past for product: ${(product as any).name}`);
      }
    }

    const purchaseItem = await PurchaseItemModel.create({
      date: p.date || (existingPurchase as any).date,
      warehouse_id: (existingPurchase as any).warehouse_id,
      purchase_id: existingPurchase._id,
      category_id,
      product_id,
      patch_number: p.patch_number,
      quantity: p.quantity,
      unit_cost: p.unit_cost,
      subtotal: p.subtotal,
      discount_share: p.discount_share || 0,
      unit_cost_after_discount: p.unit_cost_after_discount || p.unit_cost,
      tax: p.tax || 0,
      item_type: "product",
      date_of_expiery: (product as any).exp_ability ? p.date_of_expiery : undefined,
    });

    await ProductModel.findByIdAndUpdate(product._id, { $inc: { quantity: p.quantity ?? 0 } });

    const category = await CategoryModel.findById((product as any).categoryId);
    if (category) {
      (category as any).product_quantity += p.quantity ?? 0;
      await category.save();
    }

    if (warehouse) {
      (warehouse as any).stock_Quantity += p.quantity ?? 0;
      await warehouse.save();
    }

    let productWarehouse = await Product_WarehouseModel.findOne({
      productId: product_id,
      warehouseId: (existingPurchase as any).warehouse_id,
    });

    if (productWarehouse) {
      (productWarehouse as any).quantity += p.quantity ?? 0;
      await productWarehouse.save();
    } else {
      await Product_WarehouseModel.create({
        productId: product_id,
        warehouseId: (existingPurchase as any).warehouse_id,
        quantity: p.quantity ?? 0,
      });
    }

    if (p.options && Array.isArray(p.options)) {
      for (const opt of p.options) {
        await PurchaseItemOptionModel.create({
          purchase_item_id: purchaseItem._id,
          option_id: opt.id || opt.option_id,
        });
      }
    }
  }

  // ========== Process New Materials ==========
  for (const m of purchase_materials) {
    const material = await MaterialModel.findById(m.material_id);
    if (!material) throw new NotFound(`Material not found: ${m.material_id}`);

    await PurchaseItemModel.create({
      date: m.date || (existingPurchase as any).date,
      warehouse_id: (existingPurchase as any).warehouse_id,
      purchase_id: existingPurchase._id,
      category_id: (material as any).category_id,
      material_id: m.material_id,
      patch_number: m.patch_number,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      subtotal: m.subtotal,
      discount_share: m.discount_share || 0,
      unit_cost_after_discount: m.unit_cost_after_discount || m.unit_cost,
      tax: m.tax || 0,
      item_type: "material",
    });

    (material as any).quantity += m.quantity ?? 0;
    await material.save();

    if (warehouse) {
      (warehouse as any).stock_Quantity += m.quantity ?? 0;
      await warehouse.save();
    }
  }

  // ========== Create New Invoices ==========
  if (financials && Array.isArray(financials)) {
    for (const ele of financials) {
      await PurchaseInvoiceModel.create({
        financial_id: ele.financial_id,
        amount: ele.payment_amount,
        purchase_id: existingPurchase._id,
      });

      const financial = await BankAccountModel.findById(ele.financial_id);
      if (financial) {
        (financial as any).balance -= ele.payment_amount;
        await financial.save();
      }
    }
  }

  // ========== Create New Due Payments ==========
  if (purchase_due_payment && Array.isArray(purchase_due_payment)) {
    for (const due_payment of purchase_due_payment) {
      await PurchaseDuePaymentModel.create({
        purchase_id: existingPurchase._id,
        amount: due_payment.amount,
        date: due_payment.date,
      });
    }
  }

  const fullPurchase = await PurchaseModel.findById(existingPurchase._id)
    .populate("items")
    .populate("warehouse_id")
    .populate("supplier_id")
    .populate("tax_id");

  SuccessResponse(res, { message: "Purchase updated successfully", purchase: fullPurchase });
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