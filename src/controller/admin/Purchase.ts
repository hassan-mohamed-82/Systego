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

import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import {generateBarcodeImage,generateEAN13Barcode} from "../../utils/barcode"


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

    purchase_items, 
    payment_amount,
    financial_id,
    purchase_due_payment,
  } = req.body;
 
  const existitWarehouse = await WarehouseModel.findById(warehouse_id);
  if (!existitWarehouse) throw new BadRequest("Warehouse not found");

  const existitSupplier = await SupplierModel.findById(supplier_id);
  if (!existitSupplier) throw new BadRequest("Supplier not found");

  const existitCurrency = await CurrencyModel.findById(currency_id);
  if (!existitCurrency) throw new BadRequest("Currency not found");

  const existitTax = await TaxesModel.findById(tax_id);
  if (!existitTax) throw new BadRequest("Tax not found");

  // زيادة عدد الستوك في الكاتيجوري
  // existitcategory.Purchase_quantity += 1;

  // 🖼️ حفظ الصورة الأساسية
  let imageUrl = receipt_img;
  if (receipt_img && receipt_img.startsWith("data:")) {
    imageUrl = await saveBase64Image(receipt_img, Date.now().toString(), req, "Purchases");
  }   

  // 1️⃣ إنشاء المنتج الأساسي (quantity تبدأ بـ 0)
  const purchase = await PurchaseModel.create({
    date,
    warehouse_id,
    supplier_id,
    receipt_img : imageUrl,
    currency_id,
    payment_status,
    exchange_rate,
    subtotal,
    shiping_cost,
    discount,
    tax_id,  
  });

  // 2️⃣ إنشاء المنتجات (PurchaseItems) + الـ options
  let totalQuantity = 0;
  if (purchase_items && Array.isArray(purchase_items)) {
    for (const p of purchase_items) {
      // إنشاء PurchasePrice
      const PurchaseItems = await PurchaseItemModel.create({
        date: p.date,
        purchase_id: purchase._id,
        category_id: p.category_id,
        product_id: p.product_id,
        quantity: p.quantity,
        unit_cost: p.unit_cost,
        discount: p.discount,
        tax: p.tax,
        subtotal: p.subtotal,
      });
      let product = await ProductModel.findById(p.product_id);
      if(product){
        product.quantity += p.quantity ?? 0;
        product.save();
        let category = await CategoryModel.findById(product.categoryId);
        if(category){
          category.product_quantity += p.quantity ?? 0;
          category.save();
        }
      }
      let product_warehouse = await Product_WarehouseModel.findOne({
        productId : p.product_id,
        WarehouseId : purchase.warehouse_id,
      });
      if(product_warehouse){
        product_warehouse.quantity += p.quantity ?? 0;
        product_warehouse.save();
      }
      else{
        await Product_WarehouseModel.create({
          productId: p.product_id,
          WarehouseId: purchase.warehouse_id,
          quantity: p.quantity ?? 0
        });
      }
      // جمع الكمية النهائية
      totalQuantity += p.quantity || 0;

      // 3️⃣ إضافة الـ Options
      if (p.options && Array.isArray(p.options)) {
        for (const opt of p.options) {
          await PurchaseItemOptionModel.create({
            date: opt.date,
            purchase_item_id: PurchaseItems._id,
            option_id: opt.id,
          });
        }
      }
    }
  }  

  // عمل invoice بالمدفوع
  await PurchaseInvoiceModel.create({
    financial_id : financial_id,
    amount : payment_amount,
    purchase_id : purchase._id,
  });
  // 3️⃣ إضافة الـ invoices
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



// ✅ READ (with populate)
export const getPurchase = async (req: Request, res: Response): Promise<void> => {
  const [
    purchases,
    warehouses,
    currencies,
    suppliers,
    taxes,
    financial_account,
    products,
    variations
  ] = await Promise.all([
    PurchaseModel.find()
      .select('_id date shiping_cost discount')
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
    VariationModel.find({ status: true })
      .select('_id name')
      .populate({
        path: "options",
        select: "_id name",
        match: { status: true }
      })
      .lean()
  ]);

  SuccessResponse(res, {
    purchases,
    warehouses,
    currencies,
    suppliers,
    taxes,
    financial_account,
    products,
    variations
  });
};

export const updatePurchase = async (req: Request, res: Response) => {
  const { id } = req.params;

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

    purchase_items,  
  } = req.body;

  const purchase = await PurchaseModel.findById(id);
  if (!purchase) throw new NotFound("Purchase not found");

  // ✅ تحديث الصورة
  if (receipt_img && receipt_img.startsWith("data:")) {
    purchase.receipt_img = await saveBase64Image(receipt_img, Date.now().toString(), req, "Purchases");
  } else if (receipt_img) {
    purchase.receipt_img = receipt_img;
  } 

    
  // ✅ تحديث باقي الحقول (من غير quantity)
  purchase.date = date ?? purchase.date;
  purchase.warehouse_id = warehouse_id ?? purchase.warehouse_id;
  purchase.supplier_id = supplier_id ?? purchase.supplier_id;
  purchase.currency_id = currency_id ?? purchase.currency_id;
  purchase.payment_status = payment_status ?? purchase.payment_status;
  purchase.exchange_rate = exchange_rate ?? purchase.exchange_rate;
  purchase.subtotal = subtotal ?? purchase.subtotal;
  purchase.shiping_cost = shiping_cost ?? purchase.shiping_cost;
  purchase.discount = discount ?? purchase.discount;
  purchase.tax_id = tax_id ?? purchase.tax_id;
  await purchase.save();
  
  if (purchase_items && Array.isArray(purchase_items)) {
    for (const p of purchase_items) { 

      if (p._id) {
        // update
        const purchase_item = await PurchaseItemModel.findById(p._id);
         
        if(purchase_item){
        // new quantity of product
          let product = await ProductModel.findById(purchase_item.product_id);
          if(product && p.quantity){
            product.quantity = product.quantity - purchase_item.quantity + p.quantity;
            product.save();
            let category = await CategoryModel.findById(product.categoryId);
            if(category && p.quantity){
              category.product_quantity = category.product_quantity - purchase_item.quantity + p.quantity;
              category.save();
            }
          }
          let product_warehouse = await Product_WarehouseModel.findOne({
            productId : purchase_item.product_id,
            WarehouseId : purchase.warehouse_id,
          });
          if(product_warehouse && p.quantity){
            product_warehouse.quantity = product_warehouse.quantity - purchase_item.quantity + p.quantity;
            product_warehouse.save();
          }
          else if(p.quantity){
            await Product_WarehouseModel.create({
              productId: purchase_item.product_id,
              WarehouseId: purchase.warehouse_id,
              quantity: p.quantity
            });
          }
        }
        // __________________________
        if (purchase_item) {
          purchase_item.date = p.date ?? purchase_item.date;
          purchase_item.category_id = p.category_id ?? purchase_item.category_id;
          purchase_item.product_id = p.product_id ?? purchase_item.product_id;
          purchase_item.quantity = p.quantity ?? purchase_item.quantity;
          purchase_item.unit_cost = p.unit_cost ?? purchase_item.unit_cost;
          purchase_item.tax = p.tax ?? purchase_item.tax;
          purchase_item.subtotal = p.subtotal ?? purchase_item.subtotal;
          await purchase_item.save();
            if(p.options){
              // ____________________________
              for (const element of p.options) {
                if(element._id){
                  let option_item =await PurchaseItemOptionModel.findById(element._id);
                  if(option_item) {
                    option_item.date = element.date ?? option_item.date;
                    option_item.option_id = element.option_id ?? option_item.option_id;
                    option_item.save();
                  }
                }
                else{
                  await PurchaseItemOptionModel.create({
                    date: element.date,
                    purchase_item_id: purchase_item._id,
                    option_id: element.id,
                  });
                }
              }
              // ____________
            }
         } else {
          // إنشاء create
          const PurchaseItems = await PurchaseItemModel.create({
            date: p.date,
            purchase_id: purchase._id,
            category_id: p.category_id,
            product_id: p.product_id,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
            discount: p.discount,
            tax: p.tax,
            subtotal: p.subtotal,
          }); 

          // 3️⃣ إضافة الـ Options
          if (p.options && Array.isArray(p.options)) {
            for (const opt of p.options) {
              await PurchaseItemOptionModel.create({
                date: opt.date,
                purchase_item_id: PurchaseItems._id,
                option_id: opt.id,
              });
            }
          }
        }
      } 
    }
  }
  SuccessResponse(res, { message: "Purchase updated successfully", purchase });
};
