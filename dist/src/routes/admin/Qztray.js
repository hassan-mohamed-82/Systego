"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Qztray_1 = require("../../controller/admin/Qztray");
const router = (0, express_1.Router)();
router.get('/cert', Qztray_1.getCert);
router.post('/sign', Qztray_1.signData);
router.get('/sign', Qztray_1.signData); // Support GET as fallback
exports.default = router;
