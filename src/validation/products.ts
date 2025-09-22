import Joi from "joi";

export const createproductSchema = Joi.object({
    name: Joi.string().required(),
    icon: Joi.string().optional(),
    code: Joi.string().required(),
    quantity: Joi.number().required(),
    brand_id: Joi.string().required(),
    category_id: Joi.string().required(),
    unit: Joi.string().valid("piece", "kilogram", "liter", "meter").required(),
    price: Joi.number().required(),
    cost: Joi.number().required(),
    stock_worth: Joi.number().required(),
    exp_date: Joi.date().required(),
    notify_near_expiry: Joi.boolean().required(),
    barcode_number: Joi.string().required(),
    barcode_image: Joi.string().optional(),
    
});

export const updateproductSchema = Joi.object({
    name: Joi.string().optional(),
    icon: Joi.string().optional(),
    code: Joi.string().optional(),
    quantity: Joi.number().optional(),
    brand_id: Joi.string().optional(),
    category_id: Joi.string().optional(),
    unit: Joi.string().valid("piece", "kilogram", "liter", "meter").optional(),
    price: Joi.number().optional(),
    cost: Joi.number().optional(),
    stock_worth: Joi.number().optional(),
    exp_date: Joi.date().optional(),
    notify_near_expiry: Joi.boolean().optional(),
    barcode_number: Joi.string().optional(),
    barcode_image: Joi.string().optional(),
});