import Joi from "joi";

const productSchema = Joi.object({
    productId: Joi.string().required(),
    productPriceId: Joi.string().allow(null, "").optional(),
    quantity: Joi.number().min(1).default(1),
});

export const createPandelSchema = Joi.object({
    name: Joi.string().required(),
    warehouse_id: Joi.string().optional(),
    warehouse_ids: Joi.array().items(Joi.string()).min(1).optional(),
    all_warehouses: Joi.boolean().optional(),
    startdate: Joi.date().required(),
    enddate: Joi.date().required(),
    status: Joi.boolean().default(true),
    images: Joi.array().items(Joi.string()).optional(),
    products: Joi.array().items(productSchema).min(1).required(),
    price: Joi.number().positive().required(),
});

export const updatePandelSchema = Joi.object({
    name: Joi.string(),
    warehouse_id: Joi.string(),
    warehouse_ids: Joi.array().items(Joi.string()).min(1),
    all_warehouses: Joi.boolean(),
    startdate: Joi.date(),
    enddate: Joi.date(),
    status: Joi.boolean(),
    images: Joi.array().items(Joi.string()),
    products: Joi.array().items(productSchema).min(1),
    price: Joi.number().positive(),
});
