// src/constants/permissions.ts

export const MODULES = [
  "user",
  "category",
  "product",
  "warehouse",
  "payment_method",
  "brand",
  "city",
  "country",
  "zone",
  "POS",
  "notification",
  "variation",
  "transfer",
  "product_warehouse",
  "Taxes",
  "discount",
  "coupon",
  "Supplier",
  "customer",
  "gift_card",
  "financial_account",
  "pandel",
  "customer_group",
  "purchase",
  "popup",
  "offer",
  "point",
  "redeem_points",
  "adjustment",
  "Admin",
  "Booking",
  "cashier",
  "cashier_shift",
  "cashier_shift_report",
  "currency",
  "expense_category",
  "generate_label",
  "stock",
  "payment",
  "paymob",
  "material",
  "recipe",
  "adjustment_reason",
  "Category_Material",
] as const;

// أسماء بس، من غير ids
export const ACTION_NAMES = ["View", "Add", "Edit", "Delete", "Status"] as const;

export type ModuleName = (typeof MODULES)[number];
export type ActionName = (typeof ACTION_NAMES)[number];
