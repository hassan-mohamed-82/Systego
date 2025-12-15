import Joi from "joi";

export const objectId = Joi.string().hex().length(24);

export const optionSchema = objectId;

export const priceSchema = Joi.object({
  _id: objectId.optional(),
  price: Joi.number().required(),
  code: Joi.string().required(),
  start_quantity: Joi.number().optional(),
  cost: Joi.number().optional(),
  quantity: Joi.number().optional(),
  gallery: Joi.array().items(Joi.string()).optional(), 
  options: Joi.array().items(optionSchema).optional(),
});

export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  ar_description: Joi.string().required(),
  image: Joi.string().optional(), 
  code: Joi.string(),
  categoryId: Joi.array().items(objectId).min(1).required(),
  brandId: objectId.required(),
  unit: Joi.string().required(),
  price: Joi.number().required(),
  quantity: Joi.number().optional(),
  description: Joi.string().optional(),
  exp_ability: Joi.boolean().optional(),
  cost: Joi.number().optional(),
  minimum_quantity_sale: Joi.number().optional(),
  low_stock: Joi.number().optional(),
  whole_price: Joi.number().optional(),
  start_quantaty: Joi.number().optional(),
  taxesId: objectId.optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery_product: Joi.array().items(Joi.string()).optional(), 
  prices: Joi.array().items(priceSchema).optional(),
  is_featured: Joi.boolean().optional()
});

export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  ar_name: Joi.string().optional(),
  ar_description: Joi.string().optional(),
  image: Joi.string().optional(), 
  categoryId: Joi.array().items(objectId).optional(),
  brandId: objectId.optional(),
  unit: Joi.string().optional(),
  price: Joi.number().optional(),
  quantity: Joi.number().optional(),
  description: Joi.string().optional(),
  exp_ability: Joi.boolean().optional(),
  code: Joi.string().optional(),
  cost: Joi.number().optional(),
  minimum_quantity_sale: Joi.number().optional(),
  low_stock: Joi.number().optional(),
  whole_price: Joi.number().optional(),
  start_quantaty: Joi.number().optional(),
  taxesId: objectId.optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery_product: Joi.array().items(Joi.string()).optional(), 
  prices: Joi.array().items(priceSchema).optional(),
  is_featured: Joi.boolean().optional()
});
