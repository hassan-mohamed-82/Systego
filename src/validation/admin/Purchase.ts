import Joi from "joi";

export const optionSchema = Joi.string(); // مجرد ObjectId

export const createPurchaseItemOptionSchema = Joi.object({
  option_id: Joi.string().required(),
});

export const createPurchaseItemSchema = Joi.object({
  date: Joi.date().required(),
  category_id: Joi.string().optional(),
  product_id: Joi.string().optional(),
  product_code: Joi.string().optional(),
  quantity: Joi.number().required(),
  unit_cost: Joi.number().required(),
  discount: Joi.number().required(),
  tax: Joi.number().required(),
  subtotal: Joi.number().required(),
  options: Joi.array().items(createPurchaseItemOptionSchema).optional(),
});

export const createPurchaseDuePaymentSchema = Joi.object({
  date: Joi.date().required(),
  amount: Joi.number().required(),
});

export const createFinancialSchema = Joi.object({
  financial_id: Joi.string().required(),
  payment_amount: Joi.number().required(),
});


export const createPurchaseSchema = Joi.object({
  date: Joi.string().required(),
  warehouse_id: Joi.string().required(),
  supplier_id: Joi.string().required(),
  receipt_img: Joi.string().required(),
  currency_id: Joi.string().required(),
  tax_id: Joi.string().optional(),
  payment_status: Joi.string().valid("pending", "partial", "paid").required(),
  exchange_rate: Joi.number().required(),
  subtotal: Joi.number().required(),
  shiping_cost: Joi.number().required(),
  discount: Joi.number().required(),
  purchase_items: Joi.array().items(createPurchaseItemSchema).required(), 
  financials: Joi.array().items(createFinancialSchema).required(), 
  purchase_due_payment: Joi.array().items(createPurchaseDuePaymentSchema).required(), 
});

// ___________________ Update _________________________

export const updatePurchaseItemOptionSchema = Joi.object({
  option_id: Joi.string().optional(),
});

export const updatePurchaseItemSchema = Joi.object({
  date: Joi.date().optional(),
  _id: Joi.number().optional(),
  category_id: Joi.string().optional(),
  product_code: Joi.string().optional(),
  product_id: Joi.string().optional(),
  quantity: Joi.number().optional(),
  unit_cost: Joi.number().optional(),
  discount: Joi.number().optional(),
  tax: Joi.number().optional(),
  subtotal: Joi.number().optional(),
  options: Joi.array().items(updatePurchaseItemOptionSchema).optional(),
}); 

export const updatePurchaseSchema = Joi.object({
    date: Joi.string().optional(),
    warehouse_id: Joi.string().optional(),
    supplier_id: Joi.string().optional(),
    receipt_img: Joi.string().optional(),
    currency_id: Joi.string().optional(),
    tax_id: Joi.string().optional(),
    exchange_rate: Joi.number().optional(),
    shiping_cost: Joi.number().optional(),
    discount: Joi.number().optional(),
    purchase_items: Joi.array().items(updatePurchaseItemSchema).optional(),
});
