import Joi from "joi";

export const addressSchema = Joi.object({
    country: Joi.string().hex().length(24).required().messages({
        "any.required": "Country is required",
    }),
    city: Joi.string().hex().length(24).required().messages({
        "any.required": "City is required",
    }),
    zone: Joi.string().hex().length(24).required().messages({
        "any.required": "Zone is required",
    }),
    street: Joi.string().min(3).required().messages({
        "string.min": "Street must be at least 3 characters long",
        "any.required": "Street is required",
    }),
    buildingNumber: Joi.string().required().messages({
        "any.required": "Building number is required",
    }),
    floorNumber: Joi.string().optional(),
    apartmentNumber: Joi.string().optional(),
    uniqueIdentifier: Joi.string().optional(),
});

export const updateAddressSchema = addressSchema.fork(
    ['country', 'city', 'zone', 'street', 'buildingNumber'],
    (schema) => schema.optional()
);