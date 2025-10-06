import { Router } from "express";
import authRouter from "./auth";
import brandRouter from "./brand";
import AdminRouter from "./Admin";
import CategoryRouter from "./category";
import permissionRouter from './permission';
import productRouter from './products';
import supplierRouter from './suppliers';
import WarehouseRouter from "./Warehouse"
import CouriersRouter from "./Couriers"
import paymentMethodRouter from "./payment_method";
import ExpeenseCategoryRouter from "./ExpenseCategory";
import expensesRouter from './expenses'
import CouponsRouter from './coupons'
import DepartmentRouter from './departments'
import AdjustmentRouter from './adjustments'
import incomeCategoryRouter from "./income_categories";
import BankAccountRouter from "./Financial_Account";
import CountryRouter from "./Country";
import CityRouter from "./City";
// import ZoneRouter from "./Zone";
import CurrencyRouter from "./Currency";
import TaxesRouter from "./Taxes";
import VariationRouter from "./Variation";
import trnsferRouter from "./Transfer"
import Product_warehouseRouter from "./product_warehouse"
import { authenticated } from "../../middlewares/authenticated";
import { authorize } from "../../middlewares/authorized";
export const route = Router();

route.use("/auth", authRouter);
route.use(authenticated,authorize("admin","superadmin"));
route.use("/brand", brandRouter);
route.use("/admin", AdminRouter);
route.use("/permission",permissionRouter);
route.use("/category",CategoryRouter);
route.use("/product",productRouter);
route.use("/supplier",supplierRouter);
route.use("/warehouse",WarehouseRouter)
route.use("/courier",CouriersRouter)
route.use("/expense_category",ExpeenseCategoryRouter)
route.use("/payment_method",paymentMethodRouter)
route.use("/expense",expensesRouter)
route.use("/coupon",CouponsRouter)
route.use("/department",DepartmentRouter)
route.use("/adjustment",AdjustmentRouter)
route.use("/income_category",incomeCategoryRouter)
route.use("/bank_account",BankAccountRouter)
route.use("/country",CountryRouter);
route.use("/city",CityRouter);
// route.use("/zone",ZoneRouter);
route.use("/currency",CurrencyRouter);
route.use("/taxes",TaxesRouter);
route.use("/variation",VariationRouter);
route.use("/transfer",trnsferRouter)
route.use("/product_warehouse",Product_warehouseRouter)
export default route;
