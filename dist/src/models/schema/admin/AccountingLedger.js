"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingLedgerModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const accountingLedgerSchema = new mongoose_1.Schema({
    account_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "BankAccount",
        required: true,
        index: true,
    },
    entry_type: {
        type: String,
        enum: ["debit", "credit"],
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    reference_type: {
        type: String,
        trim: true,
        default: "system",
        index: true,
    },
    reference_id: {
        type: String,
        trim: true,
        default: "",
        index: true,
    },
    entry_date: {
        type: Date,
        default: Date.now,
        index: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Admin",
        required: false,
    },
}, { timestamps: true });
exports.AccountingLedgerModel = mongoose_1.default.model("AccountingLedger", accountingLedgerSchema);
