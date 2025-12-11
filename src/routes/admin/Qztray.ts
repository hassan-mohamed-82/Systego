import { Router } from 'express';
import { getCert, signData } from '../../controller/admin/Qztray';

const router = Router();

// /qz/cert → يرجّع الشهادة
router.get('/cert', getCert);

// /qz/sign → يوقّع الداتا اللي تبعته QZ
router.post('/sign', signData);

export default router;