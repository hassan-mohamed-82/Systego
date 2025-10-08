import Joi from "joi";

// ✅ تعريف ObjectId
export const objectId = Joi.string().hex().length(24);

// ✅ Option Schema (مجرد ID)
export const optionSchema = objectId;

// ✅ نمط الصور base64 (مع أو بدون البريفكس)
const base64ImagePattern = /^(data:image\/(png|jpeg|jpg);base64,)?[A-Za-z0-9+/=]+$/;

// ✅ Price Schema (يتبع ProductPriceModel)
export const priceSchema = Joi.object({
  _id: objectId.optional(),
  price: Joi.number().required(),
  code: Joi.string().required(),
  quantity: Joi.number().optional(),
  gallery: Joi.array()
    .items(Joi.string().pattern(base64ImagePattern))
    .optional(),
  options: Joi.array().items(optionSchema).optional(),
});

// ✅ Create Product Schema
export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().pattern(base64ImagePattern).optional(),
  categoryId: Joi.array().items(objectId).min(1).required(),
  brandId: objectId.required(),
  unit: Joi.string().required(),
  price: Joi.number().required(),
  quantity: Joi.number().optional(), // ممكن يتحسب بعدين من الأسعار
  description: Joi.string().optional(),
  exp_ability: Joi.boolean().optional(),
  date_of_expiery: Joi.date().optional(),
  minimum_quantity_sale: Joi.number().optional(),
  low_stock: Joi.number().optional(),
  whole_price: Joi.number().optional(),
  start_quantaty: Joi.number().optional(),
  taxesId: objectId.optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery_product: Joi.array()
    .items(Joi.string().pattern(base64ImagePattern))
    .optional(),
  prices: Joi.array().items(priceSchema).required(),
});

// ✅ Update Product Schema
export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  image: Joi.string().pattern(base64ImagePattern).optional(),
  categoryId: Joi.array().items(objectId).optional(),
  brandId: objectId.optional(),
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
  taxesId: objectId.optional(),
  product_has_imei: Joi.boolean().optional(),
  different_price: Joi.boolean().optional(),
  show_quantity: Joi.boolean().optional(),
  maximum_to_show: Joi.number().optional(),
  gallery_product: Joi.array()
    .items(Joi.string().pattern(base64ImagePattern))
    .optional(),
  prices: Joi.array().items(priceSchema).optional(),
});
