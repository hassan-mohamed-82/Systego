import { Request, Response, NextFunction, RequestHandler } from "express";
import Joi, { ObjectSchema } from "joi";

export const validate = (
    schema: ObjectSchema | Joi.ObjectSchema,
    target: "body" | "query" | "params" = "body"
): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.validateAsync(req[target], { abortEarly: false });
            next();
        } catch (error) {
            if (error instanceof Joi.ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message: error.message,
                        details: error.details.map((d) => d.message),
                    },
                });
            }
            next(error);
        }
    };
};