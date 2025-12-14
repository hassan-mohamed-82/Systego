"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/qz.routes.ts
const express_1 = require("express");
const Qztray_1 = require("../../controller/admin/Qztray");
const router = (0, express_1.Router)();
router.get('/cert', Qztray_1.getCert);
router.post('/sign', Qztray_1.signData);
exports.default = router;
