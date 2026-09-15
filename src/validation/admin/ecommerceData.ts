import Joi from "joi";

const headerSchema = Joi.object({
  logo: Joi.string().optional().allow("", null),
  title: Joi.string().optional().allow("", null),
  announcement: Joi.string().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  email: Joi.string().email().optional().allow("", null),
  links: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().required(),
      })
    )
    .optional(),
});

const footerSchema = Joi.object({
  logo: Joi.string().optional().allow("", null),
  bio: Joi.string().optional().allow("", null),
  description: Joi.string().optional().allow("", null),
  address: Joi.string().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  email: Joi.string().email().optional().allow("", null),
  copyright: Joi.string().optional().allow("", null),
  social_links: Joi.object({
    facebook: Joi.string().optional().allow("", null),
    instagram: Joi.string().optional().allow("", null),
    whatsapp: Joi.string().optional().allow("", null),
    twitter: Joi.string().optional().allow("", null),
    tiktok: Joi.string().optional().allow("", null),
    youtube: Joi.string().optional().allow("", null),
    linkedin: Joi.string().optional().allow("", null),
  }).optional(),
  links: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().required(),
      })
    )
    .optional(),
});

export const createEcommerceDataSchema = Joi.object({
  name: Joi.string().optional().allow("", null),
  header: headerSchema.optional(),
  footer: footerSchema.optional(),
  email: Joi.string().email().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  role: Joi.string().optional().allow("", null),
  bio: Joi.string().optional().allow("", null),
  address: Joi.string().optional().allow("", null),
  image: Joi.string().optional().allow("", null),
  social_links: Joi.object({
    facebook: Joi.string().optional().allow("", null),
    instagram: Joi.string().optional().allow("", null),
    whatsapp: Joi.string().optional().allow("", null),
    twitter: Joi.string().optional().allow("", null),
    tiktok: Joi.string().optional().allow("", null),
    youtube: Joi.string().optional().allow("", null),
    linkedin: Joi.string().optional().allow("", null),
  }).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

export const updateEcommerceDataSchema = Joi.object({
  name: Joi.string().optional().allow("", null),
  header: headerSchema.optional(),
  footer: footerSchema.optional(),
  email: Joi.string().email().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  role: Joi.string().optional().allow("", null),
  bio: Joi.string().optional().allow("", null),
  address: Joi.string().optional().allow("", null),
  image: Joi.string().optional().allow("", null),
  social_links: Joi.object({
    facebook: Joi.string().optional().allow("", null),
    instagram: Joi.string().optional().allow("", null),
    whatsapp: Joi.string().optional().allow("", null),
    twitter: Joi.string().optional().allow("", null),
    tiktok: Joi.string().optional().allow("", null),
    youtube: Joi.string().optional().allow("", null),
    linkedin: Joi.string().optional().allow("", null),
  }).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});
