"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethods_1 = require("../../controller/users/paymentMethods");
const authenticated_1 = require("../../middlewares/authenticated");
const paymentMethodRouter = (0, express_1.Router)();
paymentMethodRouter.use(authenticated_1.authenticated);
paymentMethodRouter.get("/", paymentMethods_1.getPaymentMethods);
exports.default = paymentMethodRouter;
