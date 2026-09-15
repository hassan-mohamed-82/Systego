import Joi from "joi";

const headerSchema = Joi.object({
  logo: Joi.string().optional().allow("", null),
  title: Joi.string().optional().allow("", null),
  announcement: Joi.string().optional().allow("", null),
  links: Joi.array().items(Joi.string().trim().allow("", null)).optional(),
});

const footerSchema = Joi.object({
  logo: Joi.string().optional().allow("", null),
  bio: Joi.string().optional().allow("", null),
  copyright: Joi.string().optional().allow("", null),
});

const socialLinksSchema = Joi.object({
  facebook: Joi.string().optional().allow("", null),
  instagram: Joi.string().optional().allow("", null),
  whatsapp: Joi.string().optional().allow("", null),
  twitter: Joi.string().optional().allow("", null),
  tiktok: Joi.string().optional().allow("", null),
  youtube: Joi.string().optional().allow("", null),
  linkedin: Joi.string().optional().allow("", null),
});

export const createEcommerceDataSchema = Joi.object({
  name: Joi.string().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  email: Joi.string().email().optional().allow("", null),
  address: Joi.string().optional().allow("", null),
  status: Joi.string().valid("active", "inactive").optional(),
  social_links: socialLinksSchema.optional(),
  header: headerSchema.optional(),
  footer: footerSchema.optional(),
});

export const updateEcommerceDataSchema = Joi.object({
  name: Joi.string().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  email: Joi.string().email().optional().allow("", null),
  address: Joi.string().optional().allow("", null),
  status: Joi.string().valid("active", "inactive").optional(),
  social_links: socialLinksSchema.optional(),
  header: headerSchema.optional(),
  footer: footerSchema.optional(),
});
