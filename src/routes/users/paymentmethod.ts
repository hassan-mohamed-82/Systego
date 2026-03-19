import { Router } from "express";
import { getPaymentMethods } from "../../controller/users/paymentMethods";
import { authenticated } from "../../middlewares/authenticated";

const paymentMethodRouter = Router();

paymentMethodRouter.use(authenticated);
paymentMethodRouter.get("/", getPaymentMethods);

export default paymentMethodRouter;
