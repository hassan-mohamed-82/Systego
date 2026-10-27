// src/types/moduleMeta.ts
// أسماء وأوصاف مقروءة لكل Module في نظام الصلاحيات + تجميع منطقي
// الهدف: صفحة الأدوار والصلاحيات تظهر أسماء واضحة بالعربي والإنجليزي بدل الأسماء التقنية.

export type ModuleGroupKey =
  | "overview"
  | "catalog"
  | "sales"
  | "purchases"
  | "accounting"
  | "payments"
  | "shipping"
  | "ecommerce"
  | "reports"
  | "system";

export const MODULE_GROUPS: {
  key: ModuleGroupKey;
  en: string;
  ar: string;
}[] = [
  { key: "overview", en: "Overview", ar: "نظرة عامة" },
  { key: "catalog", en: "Products & Inventory", ar: "المنتجات والمخزون" },
  { key: "sales", en: "Sales & Customers", ar: "المبيعات والعملاء" },
  { key: "purchases", en: "Purchases & Stock", ar: "المشتريات والجرد" },
  { key: "accounting", en: "Accounting & Finance", ar: "الحسابات والمالية" },
  { key: "payments", en: "Payments", ar: "المدفوعات" },
  { key: "shipping", en: "Shipping & Delivery", ar: "الشحن والتوصيل" },
  { key: "ecommerce", en: "Online Store", ar: "المتجر الإلكتروني" },
  { key: "reports", en: "Reports", ar: "التقارير" },
  { key: "system", en: "Admin & System", ar: "الإدارة والنظام" },
];

export const MODULE_META: Record<
  string,
  { en: string; ar: string; group: ModuleGroupKey }
> = {
  // Overview
  dashboard: { en: "Home & Dashboard", ar: "الرئيسية ولوحة التحكم", group: "overview" },
  home: { en: "Home & Dashboard", ar: "الرئيسية ولوحة التحكم", group: "overview" },

  // Products & Inventory
  product: { en: "Products", ar: "المنتجات", group: "catalog" },
  category: { en: "Categories", ar: "التصنيفات", group: "catalog" },
  brand: { en: "Brands", ar: "الماركات", group: "catalog" },
  variation: { en: "Variations", ar: "المتغيرات", group: "catalog" },
  Units: { en: "Units", ar: "الوحدات", group: "catalog" },
  Taxes: { en: "Taxes", ar: "الضرائب", group: "catalog" },
  product_warehouse: {
    en: "Product Stock",
    ar: "مخزون المنتجات",
    group: "catalog",
  },
  stock: { en: "Stock", ar: "المخزون", group: "catalog" },
  pandel: { en: "Bundles", ar: "الباندل", group: "catalog" },
  generate_label: {
    en: "Barcode & Labels",
    ar: "الباركود والملصقات",
    group: "catalog",
  },
  banner: { en: "Banners", ar: "البانرات", group: "catalog" },
  popup: { en: "Popups", ar: "النوافذ المنبثقة", group: "catalog" },
  offer: { en: "Offers", ar: "العروض", group: "catalog" },
  point: { en: "Loyalty Points", ar: "نقاط الولاء", group: "catalog" },
  redeem_points: {
    en: "Redeem Points",
    ar: "استبدال النقاط",
    group: "catalog",
  },
  discount: { en: "Discounts", ar: "الخصومات", group: "catalog" },
  coupon: { en: "Coupons", ar: "الكوبونات", group: "catalog" },

  // Sales & Customers
  POS: { en: "POS", ar: "نقاط البيع", group: "sales" },
  orders: { en: "Online Orders", ar: "طلبات المتجر", group: "sales" },
  order: { en: "Orders", ar: "الطلبات", group: "sales" },
  orderType: { en: "Order Types", ar: "أنواع الطلبات", group: "sales" },
  Booking: { en: "Bookings", ar: "الحجوزات", group: "sales" },
  customer: { en: "Customers", ar: "العملاء", group: "sales" },
  customer_group: {
    en: "Customer Groups",
    ar: "مجموعات العملاء",
    group: "sales",
  },
  cashier: { en: "Cashiers", ar: "الكاشير", group: "sales" },
  cashier_shift: {
    en: "Cashier Shifts",
    ar: "ورديات الكاشير",
    group: "sales",
  },
  cashier_shift_report: {
    en: "Shift Reports",
    ar: "تقارير الورديات",
    group: "sales",
  },
  gift_card: { en: "Gift Cards", ar: "بطاقات الهدايا", group: "sales" },
  installments: {
    en: "Installments",
    ar: "التقسيط",
    group: "sales",
  },

  // Purchases & Stock
  purchase: { en: "Purchases", ar: "المشتريات", group: "purchases" },
  purchase_return: {
    en: "Purchase Returns",
    ar: "مرتجعات المشتريات",
    group: "purchases",
  },
  expiring: {
    en: "Expiring Products",
    ar: "منتجات قاربت على الانتهاء",
    group: "purchases",
  },
  all_returns: { en: "All Returns", ar: "كل المرتجعات", group: "purchases" },
  wasted: { en: "Wasted Items", ar: "الهوالك", group: "purchases" },
  stocktake: { en: "Stock Take", ar: "الجرد", group: "purchases" },
  transfer: {
    en: "Stock Transfer",
    ar: "التحويل بين المخازن",
    group: "purchases",
  },
  warehouse: { en: "Warehouses", ar: "المخازن", group: "purchases" },
  adjustment: { en: "Adjustments", ar: "التسويات", group: "purchases" },
  adjustment_reason: {
    en: "Adjustment Reasons",
    ar: "أسباب التسوية",
    group: "purchases",
  },
  material: { en: "Raw Materials", ar: "المواد الخام", group: "purchases" },
  recipe: {
    en: "Manufacturing Recipes",
    ar: "وصفات التصنيع",
    group: "purchases",
  },
  Category_Material: {
    en: "Material Categories",
    ar: "تصنيفات المواد",
    group: "purchases",
  },
  pickup_point: {
    en: "Pickup Points",
    ar: "نقاط الاستلام",
    group: "purchases",
  },
  Supplier: { en: "Suppliers", ar: "الموردون", group: "purchases" },

  // Accounting & Finance
  financial_account: {
    en: "Financial Accounts",
    ar: "الحسابات المالية",
    group: "accounting",
  },
  Revenue: { en: "Revenue", ar: "الإيرادات", group: "accounting" },
  expenseAdmin: { en: "Expenses", ar: "المصروفات", group: "accounting" },
  expense_category: {
    en: "Expense Categories",
    ar: "تصنيفات المصروفات",
    group: "accounting",
  },
  service_fees: { en: "Service Fees", ar: "رسوم الخدمة", group: "accounting" },
  ledger: { en: "Ledger", ar: "دفتر الأستاذ", group: "accounting" },
  payable: {
    en: "Payable (Suppliers)",
    ar: "مستحقات الموردين",
    group: "accounting",
  },
  recevible: {
    en: "Receivable (Customers)",
    ar: "مستحقات العملاء",
    group: "accounting",
  },
  currency: { en: "Currencies", ar: "العملات", group: "accounting" },
  decimal_setting: {
    en: "Decimal Settings",
    ar: "إعدادات الكسور",
    group: "accounting",
  },
  reserve: { en: "Reservations", ar: "الحجوزات المالية", group: "accounting" },

  // Payments
  payment: { en: "Payments", ar: "المدفوعات", group: "payments" },
  payment_method: {
    en: "Payment Methods",
    ar: "طرق الدفع",
    group: "payments",
  },
  paymob: { en: "Paymob Gateway", ar: "بوابة Paymob", group: "payments" },
  pay: { en: "Payment Gateways", ar: "بوابات الدفع", group: "payments" },
  fawry: { en: "Fawry", ar: "فوري", group: "payments" },
  payment_eco: {
    en: "Store Payments",
    ar: "مدفوعات المتجر",
    group: "payments",
  },

  // Shipping & Delivery
  shipping: { en: "Shipping Settings", ar: "إعدادات الشحن", group: "shipping" },
  courier: { en: "Couriers", ar: "شركات الشحن", group: "shipping" },
  delivery_man: {
    en: "Delivery Agents",
    ar: "مندوبو التوصيل",
    group: "shipping",
  },
  free_shipping_products: {
    en: "Free Shipping Products",
    ar: "منتجات الشحن المجاني",
    group: "shipping",
  },
  zone: { en: "Shipping Zones", ar: "مناطق الشحن", group: "shipping" },
  city: { en: "Cities", ar: "المدن", group: "shipping" },
  country: { en: "Countries", ar: "الدول", group: "shipping" },

  // Online Store
  ecommerce: { en: "Store Settings", ar: "إعدادات المتجر", group: "ecommerce" },

  // Reports
  sale_report: { en: "Sales Report", ar: "تقرير المبيعات", group: "reports" },
  product_report: {
    en: "Products Report",
    ar: "تقرير المنتجات",
    group: "reports",
  },
  product_movement: {
    en: "Product Movement",
    ar: "حركة المنتجات",
    group: "reports",
  },
  financial_report: {
    en: "Financial Report",
    ar: "التقرير المالي",
    group: "reports",
  },

  // Admin & System
  Admin: { en: "Admin Users", ar: "مستخدمو الإدارة", group: "system" },
  user: { en: "Users", ar: "المستخدمون", group: "system" },
  permission: {
    en: "Roles & Permissions",
    ar: "الأدوار والصلاحيات",
    group: "system",
  },
  profile: { en: "Profile", ar: "الملف الشخصي", group: "system" },
  notification: { en: "Notifications", ar: "الإشعارات", group: "system" },
};

function prettify(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getModuleMeta(name: string) {
  const meta = MODULE_META[name];
  if (meta) return meta;
  const label = prettify(name);
  return { en: label, ar: label, group: "system" as ModuleGroupKey };
}

export function moduleGroupOrder(group: ModuleGroupKey): number {
  const index = MODULE_GROUPS.findIndex((g) => g.key === group);
  return index === -1 ? MODULE_GROUPS.length : index;
}
