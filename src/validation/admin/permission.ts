import Joi from "joi";

export const createPositionWithRolesAndActionsSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),

  roles: Joi.array().items(
    Joi.object({
      name: Joi.string().min(3).max(50).required(),
      actions: Joi.array()
        .items(Joi.string().valid("add", "update", "delete", "get"))
        .required(),
    })
  ).required(),
});

export const updatePositionWithRolesAndActionsSchema = Joi.object({
  name: Joi.string().min(3).max(50), // مش required هنا
  roles: Joi.array().items(
    Joi.object({
      name: Joi.string().min(3).max(50),
      actions: Joi.array().items(
        Joi.string().valid("add", "update", "delete", "get")
      ),
    })
  ),
});