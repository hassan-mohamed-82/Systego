import { BookingModel } from "../Booking";
import { BrandModel } from "../brand";
import { CashierModel } from "../cashier";
import { CashierShift } from "./CashierShift";
import { CategoryModel } from "../category";
import { CityModels } from "../City";
import { CountryModel } from "../Country";
import { CouponModel } from "../coupons";
import { CurrencyModel } from "../Currency";
import { CustomerGroupModel, CustomerModel } from "./customer";
import { DiscountModel } from "../Discount";
import { ExpenseCategoryModel } from "../expensecategory";
import { ExpenseModel } from "./expenses";
import { FawryModel } from "../Fawry";
import { BankAccountModel } from "../Financial_Account";
import { GeideaModel } from "../Geidea";
import { GiftCardModel } from "./giftCard";
import { NotificationModel } from "../Notfication";
import { OrderModel } from "../../users/Order";
import { PandelModel } from "../pandels";
import { PaymentModel } from "./payment";
import { PaymobModel } from "../Paymob";
import { PaymentMethodModel } from "../payment_methods";
import { PositionModel } from "../position";
import { ProductModel } from "../products";
import { ProductPriceModel, ProductPriceOptionModel } from "../product_price";
import { Product_WarehouseModel } from "../Product_Warehouse";
import { PurchaseModel } from "../Purchase";
import { ReturnModel } from "./ReturnSale";
import { RoleModel } from "../roles";
import { ProductSalesModel, SaleModel } from "./Sale";
import { ServiceFeeModel } from "../ServiceFee";
import { TaxesModel } from "../Taxes";
import { UserModel } from "../User";
import { OptionModel, VariationModel } from "../Variation";
import { WarehouseModel } from "../Warehouse";

import { Model } from "mongoose";
import { PurchaseItemModel } from "../purchase_item";

export const syncableModels: Record<string, Model<any>> = {
  Booking: BookingModel,
  Brand: BrandModel,
  Cashier: CashierModel,
  CashierShift: CashierShift,
  Category: CategoryModel,
  City: CityModels,
  Country: CountryModel,
  Coupon: CouponModel,
  Currency: CurrencyModel,
  Customer: CustomerModel,
  customer_groups: CustomerGroupModel,
  Discount: DiscountModel,
  ExpenseCategory: ExpenseCategoryModel,
  Expense: ExpenseModel,
  Fawry: FawryModel,
  BankAccount: BankAccountModel,
  Geidea: GeideaModel,
  GiftCard: GiftCardModel,
  Notification: NotificationModel,
  Orders: OrderModel,
  Pandel: PandelModel,
  Payment: PaymentModel,
  PaymentMethod: PaymentMethodModel,
  Paymob: PaymobModel,
  Position: PositionModel,
  Product: ProductModel,
  ProductPrice: ProductPriceModel,
  ProductPriceOption: ProductPriceOptionModel,
  Product_Warehouse: Product_WarehouseModel,
  PurchaseItem: PurchaseItemModel,
  Return: ReturnModel,
  Role: RoleModel,
  Sale: SaleModel,
  ProductSale: ProductSalesModel,
  ServiceFee: ServiceFeeModel,
  Taxes: TaxesModel,
  User: UserModel,
  Variation: VariationModel,
  Option: OptionModel,
  Warehouse: WarehouseModel,
};

export function getSyncModel(table: string): Model<any> {
  const model = syncableModels[table];
  if (!model) {
    throw new Error(`Unknown sync table: ${table}`);
  }
  return model;
}
