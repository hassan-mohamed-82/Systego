import express from "express";
import {
  getAccountingLedgers,
  getAccountingLedgerById,
} from "../../controller/admin/AccountingLedger";

// Admin routing file index.ts already uses `authenticated` middleware globally 
// at line 79: route.use(authenticated, authorizeRoles("admin", "superadmin"));
// So we don't necessarily need to add it here, but we can if we want to be safe.

const ledgerRoutes = express.Router();

ledgerRoutes.get("/", getAccountingLedgers);
ledgerRoutes.get("/:id", getAccountingLedgerById);

export default ledgerRoutes;
