"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountingLedgerById = exports.getAccountingLedgers = void 0;
const Revenue_1 = require("../../models/schema/admin/Revenue");
const response_1 = require("../../utils/response");
const getAccountingLedgers = async (req, res) => {
    try {
        const { page = 1, limit = 10, transactionType, actionType, startDate, endDate, } = req.query;
        const currentPage = parseInt(page, 10) || 1;
        const itemsPerPage = parseInt(limit, 10) || 10;
        const skip = (currentPage - 1) * itemsPerPage;
        let dateFilter = {};
        if (startDate || endDate) {
            if (startDate)
                dateFilter.$gte = new Date(startDate);
            if (endDate)
                dateFilter.$lte = new Date(endDate);
        }
        else {
            dateFilter = null;
        }
        // Instead of querying a central collection, we create an aggregation 
        // using $unionWith across Revenues, Expenses, Purchases, and Sales.
        const pipeline = [
            {
                $project: {
                    transactionType: { $literal: "Revenue" },
                    actionType: { $literal: "credit" },
                    amount: "$amount",
                    date: { $ifNull: ["$date", "$createdAt"] },
                    reference_id: "$_id",
                    reference: "$name",
                    note: "$note",
                }
            },
            {
                $unionWith: {
                    coll: "expenses",
                    pipeline: [
                        {
                            $project: {
                                transactionType: { $literal: "Expense" },
                                actionType: { $literal: "debit" },
                                amount: "$amount",
                                date: { $ifNull: ["$date", "$createdAt"] },
                                reference_id: "$_id",
                                reference: "$name",
                                note: "$note",
                            }
                        }
                    ]
                }
            },
            {
                $unionWith: {
                    coll: "purchases",
                    pipeline: [
                        {
                            $project: {
                                transactionType: { $literal: "Purchase" },
                                actionType: { $literal: "debit" },
                                amount: "$grand_total",
                                date: { $ifNull: ["$date", "$createdAt"] },
                                reference_id: "$_id",
                                reference: "$reference",
                                note: "$note",
                            }
                        }
                    ]
                }
            },
            {
                $unionWith: {
                    coll: "sales",
                    pipeline: [
                        {
                            $project: {
                                transactionType: { $literal: "Sale" },
                                actionType: { $literal: "credit" },
                                amount: "$paid_amount",
                                date: { $ifNull: ["$date", "$createdAt"] },
                                reference_id: "$_id",
                                reference: "$reference",
                                note: "$note",
                            }
                        }
                    ]
                }
            }
        ];
        // Global Match Filter on the unified stream
        const matchFilter = {};
        if (transactionType)
            matchFilter.transactionType = transactionType;
        if (actionType)
            matchFilter.actionType = actionType;
        if (dateFilter)
            matchFilter.date = dateFilter;
        if (Object.keys(matchFilter).length > 0) {
            pipeline.push({ $match: matchFilter });
        }
        // Sort globally
        pipeline.push({ $sort: { date: -1 } });
        // We do a facet to get both the count and the paginated documents in 1 query
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: itemsPerPage }]
            }
        });
        const result = await Revenue_1.RevenueModel.aggregate(pipeline);
        const totalCount = result[0]?.metadata[0]?.total || 0;
        const ledgers = result[0]?.data || [];
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        return (0, response_1.SuccessResponse)(res, {
            message: "Ledgers retrieved successfully",
            data: {
                ledgers,
                pagination: {
                    currentPage,
                    itemsPerPage,
                    totalPages,
                    totalCount,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAccountingLedgers = getAccountingLedgers;
const getAccountingLedgerById = async (req, res) => {
    // Not heavily used if we do not route single clicks, but stubbed if needed
    res.status(404).json({ message: "Detailed view not mapped for aggregated entities." });
};
exports.getAccountingLedgerById = getAccountingLedgerById;
