"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethods_1 = require("../../controller/users/paymentMethods");
const paymentMethodRouter = (0, express_1.Router)();
// paymentMethodRouter.use(authenticated);
paymentMethodRouter.get("/", paymentMethods_1.getPaymentMethods);
exports.default = paymentMethodRouter;
