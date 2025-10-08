import Joi from "joi";

// ✅ ObjectId
export const objectId = Joi.string().hex().length(24);

// ✅ Option Schema (مجرد ID)
export const optionSchema = objectId;

// ✅ Price Schema (يتبع ProductPriceModel)
export const priceSchema = Joi.object({
  _id: objectId.optional(), // في حالة التعديل
  price: Joi.number().required(),
  code: Joi.string().required(), // ✅ في الموديل required
  quantity: Joi.number().default(0), // ✅ موجود في الموديل
  gallery: Joi.array().items(Joi.string()).optional(), // ✅ صور URLs
  options: Joi.array().items(optionSchema).optional(),
});

// ✅ Create Product Schema
export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().optional(), // base64 أو URL
  categoryId: Joi.array().items(objectId).min(1).required(), // ✅ لازم مصفوفة IDs
  brandId: objectId.required(),
  unit: Joi.string().required(),
  price: Joi.number().required(), // السعر الأساسي
  quantity: Joi.number().optional(), // بيتم حسابه تلقائي بعد حفظ الأسعار
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
  gallery_product: Joi.array().items(Joi.string()).optional(), // ✅ اسم الحقل الصحيح
  prices: Joi.array().items(priceSchema).required(), // ✅ الأسعار مطلوبة
});

// ✅ Update Product Schema
export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  image: Joi.string().optional(),
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
  gallery_product: Joi.array().items(Joi.string()).optional(), // ✅ نفس الاسم
  prices: Joi.array().items(priceSchema).optional(),
});
