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
    currency_id,
    payment_status,
    exchange_rate,
    subtotal,
    shiping_cost,
    discount,
    tax_id,
    purchase_items = [],
    purchase_materials = [], // ✅ جديد
    financials,
    purchase_due_payment,
  } = req.body;

  // ========== Validations ==========

  const existingWarehouse = await WarehouseModel.findById(warehouse_id);
  if (!existingWarehouse) throw new BadRequest("Warehouse not found");

  const existingSupplier = await SupplierModel.findById(supplier_id);
  if (!existingSupplier) throw new BadRequest("Supplier not found");

  const existingCurrency = await CurrencyModel.findById(currency_id);
  if (!existingCurrency) throw new BadRequest("Currency not found");

  const existingTax = await TaxesModel.findById(tax_id);
  if (!existingTax) throw new BadRequest("Tax not found");

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
    currency_id,
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

    const existingPurchaseItem = await PurchaseItemModel.findOne({ warehouse_id, product_id });
    if (!existingPurchaseItem && warehouse) {
      warehouse.number_of_products += 1;
      await warehouse.save();
    }

    const purchaseItem = await PurchaseItemModel.create({
      date: p.date,
      warehouse_id: warehouse_id,
      purchase_id: purchase._id,
      category_id: category_id,
      product_id: product_id,
      quantity: p.quantity,
      unit_cost: p.unit_cost,
      discount: p.discount,
      tax: p.tax,
      subtotal: p.subtotal,
      item_type: "product",
    });

    // Update product quantity
    const product = await ProductModel.findById(product_id);
    if (product) {
      product.quantity += p.quantity ?? 0;
      await product.save();

      const category = await CategoryModel.findById(product.categoryId);
      if (category) {
        category.product_quantity += p.quantity ?? 0;
        await category.save();
      }
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
          option_id: opt.id,
        });
      }
    }
  }

  // ========== Process Materials ========== ✅ جديد

  for (const m of purchase_materials) {
    const material = await MaterialModel.findById(m.material_id);
    if (!material) throw new NotFound(`Material not found: ${m.material_id}`);

    // Create purchase item
    await PurchaseItemModel.create({
      date: m.date || date,
      warehouse_id: warehouse_id,
      purchase_id: purchase._id,
      category_id: material.category_id,
      material_id: m.material_id,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      discount: m.discount || 0,
      tax: m.tax || 0,
      subtotal: m.subtotal,
      item_type: "material",
    });

    // Update material quantity only
    material.quantity += m.quantity ?? 0;
    await material.save();

    // Update warehouse
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

 
export const getPurchase = async (req: Request, res: Response): Promise<void> => {
  const [
    purchases,
    warehouses,
    currencies,
    suppliers,
    taxes,
    financial_account,
    products,
    materials,
    variations,
  ] = await Promise.all([
    PurchaseModel.find()
      .select("_id date shiping_cost discount")
      .populate({ path: "warehouse_id", select: "_id name" })
      .populate({ path: "supplier_id", select: "_id username phone_number" })
      .populate({ path: "currency_id", select: "_id name" })
      .populate({ path: "tax_id", select: "_id name" })
      .lean(),

    WarehouseModel.find().select("_id name").lean(),
    CurrencyModel.find().select("_id name").lean(),
    SupplierModel.find().select("_id username").lean(),
    TaxesModel.find({ status: true }).select("_id name").lean(),
    BankAccountModel.find().select("_id name").lean(),
    ProductModel.find().select("_id name").lean(),
    MaterialModel.find().select("_id name ar_name unit quantity").lean(), // ✅ جديد
    VariationModel.find({ status: true })
      .select("_id name")
      .populate({ path: "options", select: "_id name", match: { status: true } })
      .lean(),
  ]);

  SuccessResponse(res, {
    purchases,
    warehouses,
    currencies,
    suppliers,
    taxes,
    financial_account,
    products,
    materials,
    variations,
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
  purchase.date = date ?? purchase.date;
  purchase.warehouse_id = warehouse_id ?? purchase.warehouse_id;
  purchase.supplier_id = supplier_id ?? purchase.supplier_id;
  purchase.exchange_rate = exchange_rate ?? purchase.exchange_rate;
  purchase.shiping_cost = shiping_cost ?? purchase.shiping_cost;
  purchase.discount = discount ?? purchase.discount;
  purchase.tax_id = tax_id ?? purchase.tax_id;
  await purchase.save();

  // ========== Update Products ==========

  if (purchase_items && Array.isArray(purchase_items)) {
    for (const p of purchase_items) {
      if (p._id) {
        const purchaseItem = await PurchaseItemModel.findById(p._id);
        if (purchaseItem && purchaseItem.item_type === "product") {
          const product = (await ProductModel.findById(purchaseItem.product_id)) as any;

          if (product && p.quantity !== undefined) {
            const diff = p.quantity - purchaseItem.quantity;
            product.quantity += diff;
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
          }

          purchaseItem.date = p.date ?? purchaseItem.date;
          purchaseItem.quantity = p.quantity ?? purchaseItem.quantity;
          purchaseItem.unit_cost = p.unit_cost ?? purchaseItem.unit_cost;
          purchaseItem.tax = p.tax ?? purchaseItem.tax;
          purchaseItem.subtotal = p.subtotal ?? purchaseItem.subtotal;
          await purchaseItem.save();
        }
      }
    }
  }

  // ========== Update Materials ========== ✅ جديد

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
          }

          purchaseItem.date = m.date ?? purchaseItem.date;
          purchaseItem.quantity = m.quantity ?? purchaseItem.quantity;
          purchaseItem.unit_cost = m.unit_cost ?? purchaseItem.unit_cost;
          purchaseItem.tax = m.tax ?? purchaseItem.tax;
          purchaseItem.subtotal = m.subtotal ?? purchaseItem.subtotal;
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
          quantity: m.quantity,
          unit_cost: m.unit_cost,
          discount: m.discount || 0,
          tax: m.tax || 0,
          subtotal: m.subtotal,
          item_type: "material",
        });

        material.quantity += m.quantity ?? 0;
        await material.save();
      }
    }
  }

  SuccessResponse(res, { message: "Purchase updated successfully", purchase });
};


export const getOnePurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const baseUrl = req.protocol + "://" + req.get("host");
  const purchase = await PurchaseModel.findById(id)// 
    .select('_id date shiping_cost discount payment_status exchange_rate subtotal receipt_img')
    .populate({ path: "warehouse_id", select: "_id name" })
    .populate({ path: "supplier_id", select: "_id username phone_number" })
    .populate({ path: "currency_id", select: "_id name" })
    .populate({ path: "tax_id", select: "_id name" })
    .populate({path :"items", populate: "options"}) // جاي من الـ virtual
    .populate({path :"invoices", select: "_id amount date", populate: {path: "financial_id", select: "_id name"}}) // جاي من الـ virtual
    .populate({path :"duePayments", select: "_id amount date"}) // جاي من الـ virtual 
    .lean({ virtuals: true });


  if (!purchase) throw new NotFound("Purchase not found");
   
  if (purchase?.receipt_img) {
    purchase.receipt_img = `${baseUrl}/${purchase.receipt_img}`;
  }

  SuccessResponse(res, {purchase });
};