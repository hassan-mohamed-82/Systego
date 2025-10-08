import Joi from "joi";

export const optionSchema = Joi.string(); // مجرد ObjectId

export const priceSchema = Joi.object({
  _id: Joi.string().optional(), // لو موجود نعمل update
  price: Joi.number().required(),
  code: Joi.string().optional(),
  quantity: Joi.number().optional(), // ✅ أضفناها
  gallery: Joi.array().items(Joi.string()).optional(), // ✅ شيلنا .base64()
  options: Joi.array().items(optionSchema).optional(),
});

export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().optional(),
  categoryId: Joi.array().items(Joi.string().hex().length(24)).required(),
  brandId: Joi.string().hex().length(24).required(),
  unit: Joi.string().required(),
  price: Joi.number().required(),
  quantity: Joi.number().optional(), // ✅ خليها optional
  description: Joi.string().optional(),
  exp_ability: Joi.boolean().optional(),
  date_of_expiery: Joi.date().optional(),
  minimum_quantity_sale: Joi.number().optional(),
  low_stock: Joi.number().optional(),
  whole_price: Joi.number().optional(),
  start_quantaty: Joi.number().optional(),
  taxesId: Joi.string().hex().length(24).optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery: Joi.array().items(Joi.string()).optional(), // ✅ أضفناها
  prices: Joi.array().items(priceSchema).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  image: Joi.string().optional(),
  categoryId: Joi.array().items(Joi.string().hex().length(24)).optional(),
  brandId: Joi.string().hex().length(24).optional(),
  unit: Joi.string().optional(),
  price: Joi.number().optional(),
  quantity: Joi.number().optional(),
  description: Joi.string().optional(),
  exp_ability: Joi.boolean().optional(),
  date_of_expiery: Joi.date().optional(),
  minimum_quantity_sale: Joi.number().optional(),
  low_stock: Joi.number().optional(),
  whole_price: Joi.number().optional(),
  start_quantaty: Joi.number().optional(),
  taxesId: Joi.string().hex().length(24).optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery: Joi.array().items(Joi.string()).optional(), // ✅ أضفناها برضو هنا
  prices: Joi.array().items(priceSchema).optional(),
});
