"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLedgerEntryById = exports.getLedgerEntries = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AccountingLedger_1 = require("../../models/schema/admin/AccountingLedger");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const getLedgerEntries = async (req, res) => {
    const { account_id, entry_type, start_date, end_date, reference_type, reference_id } = req.query;
    const filter = {};
    if (account_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(String(account_id))) {
            throw new Errors_1.BadRequest("Invalid account_id");
        }
        filter.account_id = account_id;
    }
    if (entry_type) {
        if (!["debit", "credit"].includes(String(entry_type))) {
            throw new Errors_1.BadRequest("entry_type must be debit or credit");
        }
        filter.entry_type = entry_type;
    }
    if (reference_type)
        filter.reference_type = reference_type;
    if (reference_id)
        filter.reference_id = reference_id;
    if (start_date || end_date) {
        filter.entry_date = {};
        if (start_date)
            filter.entry_date.$gte = new Date(String(start_date));
        if (end_date)
            filter.entry_date.$lte = new Date(new Date(String(end_date)).setHours(23, 59, 59, 999));
    }
    const ledgerEntries = await AccountingLedger_1.AccountingLedgerModel.find(filter)
        .populate("account_id", "name balance")
        .sort({ entry_date: -1, createdAt: -1 });
    const totals = ledgerEntries.reduce((acc, item) => {
        if (item.entry_type === "debit")
            acc.total_debit += Number(item.amount || 0);
        else
            acc.total_credit += Number(item.amount || 0);
        return acc;
    }, { total_debit: 0, total_credit: 0 });
    return (0, response_1.SuccessResponse)(res, {
        message: "Ledger entries retrieved successfully",
        count: ledgerEntries.length,
        totals,
        ledgerEntries,
    });
};
exports.getLedgerEntries = getLedgerEntries;
const getLedgerEntryById = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new Errors_1.BadRequest("Valid ledger entry id is required");
    }
    const ledgerEntry = await AccountingLedger_1.AccountingLedgerModel.findById(id).populate("account_id", "name balance");
    if (!ledgerEntry)
        throw new Errors_1.NotFound("Ledger entry not found");
    return (0, response_1.SuccessResponse)(res, {
        message: "Ledger entry retrieved successfully",
        ledgerEntry,
    });
};
exports.getLedgerEntryById = getLedgerEntryById;
