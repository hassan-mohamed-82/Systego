"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AccountingLedger_1 = require("../../controller/admin/AccountingLedger");
// Admin routing file index.ts already uses `authenticated` middleware globally 
// at line 79: route.use(authenticated, authorizeRoles("admin", "superadmin"));
// So we don't necessarily need to add it here, but we can if we want to be safe.
const ledgerRoutes = express_1.default.Router();
ledgerRoutes.get("/", AccountingLedger_1.getAccountingLedgers);
ledgerRoutes.get("/:id", AccountingLedger_1.getAccountingLedgerById);
exports.default = ledgerRoutes;
