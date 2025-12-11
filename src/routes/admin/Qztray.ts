// src/routes/qz.routes.ts
import { Router } from 'express';
import { getCert, signData } from '../../controller/admin/Qztray';

const router = Router();

router.get('/cert', getCert);
router.get('/sign', signData);

export default router;
