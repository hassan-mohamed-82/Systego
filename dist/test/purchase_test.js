"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Purchase_1 = require("../src/models/schema/admin/Purchase");
const purchase_item_1 = require("../src/models/schema/admin/purchase_item");
const Warehouse_1 = require("../src/models/schema/admin/Warehouse");
const suppliers_1 = require("../src/models/schema/admin/suppliers");
const products_1 = require("../src/models/schema/admin/products");
const category_1 = require("../src/models/schema/admin/category");
const Financial_Account_1 = require("../src/models/schema/admin/Financial_Account");
const Purchase_2 = require("../src/controller/admin/Purchase");
dotenv_1.default.config();
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MongoDB_URI || "");
        console.log("MongoDB connected for test");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};
const runTest = async () => {
    await connectDB();
    try {
        console.log("Creating test data...");
        // 1. Create Warehouse
        const warehouse = await Warehouse_1.WarehouseModel.create({
            name: "Test Warehouse_" + Date.now(),
            address: "123 Test St",
            number_of_products: 0,
            stock_Quantity: 100
        });
        // 2. Create Category
        const category = await category_1.CategoryModel.create({
            name: "Test Category_" + Date.now(),
            ar_name: "تجربة",
            product_quantity: 10
        });
        // 3. Create Supplier
        const supplier = await suppliers_1.SupplierModel.create({
            username: "Test Supplier_" + Date.now(),
            email: "supplier_" + Date.now() + "@test.com",
            phone_number: "123456_" + Date.now()
        });
        // 4. Create Product
        const product = await products_1.ProductModel.create({
            name: "Test Product_" + Date.now(),
            ar_name: "منتج تجريبي",
            ar_description: "Description",
            categoryId: [category._id],
            price: 200,
            cost: 100,
            quantity: 50
        });
        // 5. Create Bank Account
        const bank = await Financial_Account_1.BankAccountModel.create({
            name: "Test Bank_" + Date.now(),
            warehouseId: [warehouse._id],
            balance: 10000
        });
        console.log("Initial State:");
        console.log("Warehouse Stock:", warehouse.stock_Quantity);
        console.log("Product Quantity:", product.quantity);
        console.log("Bank Balance:", bank.balance);
        // 6. Mock Request Payload
        const payload = {
            date: new Date(),
            warehouse_id: warehouse._id.toString(),
            supplier_id: supplier._id.toString(),
            payment_status: "partial",
            exchange_rate: 1,
            total: 500, // 5 * 100
            discount: 0,
            shipping_cost: 0,
            grand_total: 500,
            purchase_items: [
                {
                    product_id: product._id.toString(),
                    quantity: 5,
                    unit_cost: 100,
                    subtotal: 500
                }
            ],
            financials: [
                {
                    financial_id: bank._id.toString(),
                    payment_amount: 300
                }
            ],
            purchase_due_payment: [
                {
                    amount: 200,
                    date: new Date()
                }
            ]
        };
        // 7. Mock Req/Res
        const req = { body: payload };
        let responseData = null;
        const res = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Response Status: ${code}`);
                    responseData = data;
                }
            }),
            json: (data) => {
                responseData = data;
            }
        };
        console.log("Executing createPurchase...");
        await (0, Purchase_2.createPurchase)(req, res);
        if (responseData && responseData.message) {
            console.log("Response Message:", responseData.message);
        }
        else {
            console.log("Full Response:", responseData);
        }
        // 8. Verify Side Effects
        const updatedWarehouse = await Warehouse_1.WarehouseModel.findById(warehouse._id);
        const updatedProduct = await products_1.ProductModel.findById(product._id);
        const updatedBank = await Financial_Account_1.BankAccountModel.findById(bank._id);
        const updatedCategory = await category_1.CategoryModel.findById(category._id);
        const purchase = await Purchase_1.PurchaseModel.findOne({ warehouse_id: warehouse._id }).sort({ createdAt: -1 });
        console.log("\n--- Verification Results ---");
        // Warehouse Verification
        const expectedStock = warehouse.stock_Quantity + 5;
        console.log(`Warehouse Stock: Expected ${expectedStock}, Got ${updatedWarehouse?.stock_Quantity}. Pass: ${updatedWarehouse?.stock_Quantity === expectedStock}`);
        // Product Verification
        const expectedProdQty = (product.quantity || 0) + 5;
        console.log(`Product Quantity: Expected ${expectedProdQty}, Got ${updatedProduct?.quantity}. Pass: ${updatedProduct?.quantity === expectedProdQty}`);
        // Bank Verification
        const expectedBalance = (bank.balance || 0) - 300;
        console.log(`Bank Balance: Expected ${expectedBalance}, Got ${updatedBank?.balance}. Pass: ${updatedBank?.balance === expectedBalance}`);
        // Category Verification
        const expectedCatQty = (category.product_quantity || 0) + 5;
        console.log(`Category Quantity: Expected ${expectedCatQty}, Got ${updatedCategory?.product_quantity}. Pass: ${updatedCategory?.product_quantity === expectedCatQty}`);
        // Purchase Item Verification
        if (purchase) {
            const items = await purchase_item_1.PurchaseItemModel.find({ purchase_id: purchase._id });
            console.log(`Purchase Items Created: ${items.length}. Pass: ${items.length === 1}`);
            if (items.length > 0) {
                console.log(`Item Subtotal matches: ${items[0].subtotal === 500}`);
            }
        }
        else {
            console.log("Purchase not found!");
        }
        console.log("\nIf all 'Pass' are true, the test is successful.");
        // Cleanup
        console.log("\nCleaning up test data...");
        await Warehouse_1.WarehouseModel.findByIdAndDelete(warehouse._id);
        await suppliers_1.SupplierModel.findByIdAndDelete(supplier._id);
        await products_1.ProductModel.findByIdAndDelete(product._id);
        await category_1.CategoryModel.findByIdAndDelete(category._id);
        await Financial_Account_1.BankAccountModel.findByIdAndDelete(bank._id);
        if (purchase) {
            await Purchase_1.PurchaseModel.findByIdAndDelete(purchase._id);
            await purchase_item_1.PurchaseItemModel.deleteMany({ purchase_id: purchase._id });
            // Cleanup invoices and due payments as well in a real scenario
        }
    }
    catch (err) {
        console.error("Test failed with error:", err);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
};
// to run write npx ts-node test/purchase_test.ts
runTest();
