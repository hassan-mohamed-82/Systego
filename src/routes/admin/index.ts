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
import expensesRouter from './POS/expenses'
import CouponsRouter from './coupons'
import DepartmentRouter from './departments'
import AdjustmentRouter from './adjustments'
import BankAccountRouter from "./Financial_Account";
import CountryRouter from "./Country";
import pandelRouter from "./pandels";
import CityRouter from "./City";
import Category_MaterialRouter from "./Category_Material";
import PurchaseRouter from "./Purchase";
import discountRouter from "./discount";
import StockRouter from "./stocks";
import ZoneRouter from "./Zone";
import CurrencyRouter from "./Currency";
import generatelabelRouter from "./generatelabel";
import TaxesRouter from "./Taxes";
import VariationRouter from "./Variation";
import trnsferRouter from "./Transfer"
import RecipeRouter from "./Recipe"
import PointRouter from "./points"
import redeem_PointsRouter from "./redeem_Points"
import Product_warehouseRouter from "./product_warehouse"
import  SelectReasonRouter  from "./adjustmentsreason";
import SaleRouter from "./POS/POSRoutes"
import CustomerGroupRouter from "./POS/customerGroupRoutes"
import CustomerRouter from "./POS/customerRoutes"
import GiftCardRouter from "./POS/giftCardRoutes"
import PosHomeRouter from "./POS/POSHomeRoutes"
import CashierShiftRouter from "./POS/CashierShiftRoutes"
import BookingRouter from "./Booking"
import PopupRouter from "./Popup"
import ReturnRouter from "./POS/ReturnSaleRoutes"
import paymentRouter from "./payments"
import OffersRouter from "./Offers"
import ExpensecategoryRouter from "./expensecategory" //Rputer
import PaymobRouter from "./Paymob"
import notificationRoutrt from "./notifications"
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
route.use("/recipe",RecipeRouter);
route.use("/warehouse",WarehouseRouter)
route.use("/expensecategory",ExpensecategoryRouter)
route.use("/discount",discountRouter)
route.use("/courier",CouriersRouter)
route.use("/payment_method",paymentMethodRouter)
route.use("/expense",expensesRouter)
route.use("/pandel",pandelRouter)
route.use("/coupon",CouponsRouter)
route.use("/department",DepartmentRouter)
route.use("/adjustment",AdjustmentRouter)
route.use("/label", generatelabelRouter);
route.use("/bank_account",BankAccountRouter)
route.use("/country",CountryRouter);
route.use("/city",CityRouter);
route.use("/purchase",PurchaseRouter);
route.use("/stock",StockRouter);
route.use("/zone",ZoneRouter);
route.use("/currency",CurrencyRouter);
route.use("/taxes",TaxesRouter);
route.use("/category_material",Category_MaterialRouter);
route.use("/variation",VariationRouter);
route.use("/transfer",trnsferRouter)
route.use("/product_warehouse",Product_warehouseRouter)
route.use("/selectreason",SelectReasonRouter)
route.use("/pos",SaleRouter)
route.use("/customer-group",CustomerGroupRouter)
route.use("/customer",CustomerRouter)
route.use("/gift-card",GiftCardRouter)
route.use("/pos-home",PosHomeRouter)
route.use("/cashier-shift",CashierShiftRouter) 
route.use("/point",PointRouter)
route.use("/redeem-points",redeem_PointsRouter)
route.use("/popup",PopupRouter)
route.use("/offer",OffersRouter)
route.use("/paymob",PaymobRouter)
route.use("/payment",paymentRouter)
route.use("/notification",notificationRoutrt)


route.use("/booking",BookingRouter)
route.use("/return-sale",ReturnRouter)

  

export default route;
