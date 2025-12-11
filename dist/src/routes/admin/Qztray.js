"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Qztray_1 = require("../../controller/admin/Qztray");
const router = (0, express_1.Router)();
// /qz/cert → يرجّع الشهادة
router.get('/cert', Qztray_1.getCert);
// /qz/sign → يوقّع الداتا اللي تبعته QZ
router.post('/sign', Qztray_1.signData);
exports.default = router;
