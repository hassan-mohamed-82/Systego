// scripts/uuid-migration/config.js
//
// Collection names verified against the real database via
// db.getCollectionNames() - Mongoose auto-pluralizes/lowercases model
// names unless a custom collection name is set, so these do NOT match
// the dbdiagram's underscore_case names.
//
// idCollections: these collections get their OWN _id converted from
// ObjectId to UUID string.
//
// refOnlyCollections: these collections KEEP their own ObjectId _id,
// but contain fields that point into an idCollection, so those specific
// fields must be rewritten to the new UUID values too.
//
// refFieldsMap: for ANY collection (idCollections or refOnlyCollections),
// list only the fields that reference one of the idCollections. Fields
// pointing at collections NOT in idCollections are left completely alone.

module.exports = {
  idCollections: [
    'customers',
    'cashiershifts',     // was cashier_shifts
    'returns',
    'bookings',
    'customergroups',    // was customer_groups
    'expenses',
    'giftcards',         // was gift_cards
    'sales',
    'productsales',      // was product_sales
    'payments',
  ],

  refOnlyCollections: [
    'orders',     // orders.user -> customers
    'addresses',  // was 'address' — addresses.user -> customers
    'carts',      // carts.user -> customers
  ],

  refFieldsMap: {
    bookings: {
      CustmerId: 'customers',
      // WarehouseId, ProductId, CategoryId, option_id -> NOT migrated, left alone
    },
    customers: {
      customer_group_id: 'customergroups',
      // country, city, wishlist, addresses -> NOT migrated, left alone
    },
    expenses: {
      shift_id: 'cashiershifts',
      // Category_id, cashier_id, admin_id, financial_accountId -> NOT migrated
    },
    giftcards: {
      customer_id: 'customers',
    },
    sales: {
      customer_id: 'customers',
      Due_customer_id: 'customers',
      gift_card_id: 'giftcards',
      shift_id: 'cashiershifts',
      // warehouse_id, account_id, order_tax, order_discount, cashier_id,
      // service_fees.* -> NOT migrated, left alone
    },
    productsales: {
      sale_id: 'sales',
      // product_id, bundle_id, product_price_id, options_id -> NOT migrated
    },
    payments: {
      sale_id: 'sales',
      // financials.account_id -> NOT migrated
    },
    returns: {
      sale_id: 'sales',
      customer_id: 'customers',
      shift_id: 'cashiershifts',
      // warehouse_id, cashier_id, refund_account_id, items.* -> NOT migrated
    },
    // cashiershifts, customergroups have no fields pointing at migrated
    // collections, so no entry needed for them here.

    orders: {
      user: 'customers',
    },
    addresses: {
      user: 'customers',
    },
    carts: {
      user: 'customers',
    },
  },
};