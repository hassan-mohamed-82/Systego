import Joi from "joi";

export const  updatepaymentschema=Joi.object({

    status: Joi.string().required().valid( "completed", "failed"),
})