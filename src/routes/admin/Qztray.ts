import { Router } from 'express';
import { getCert, signData } from '../../controller/admin/Qztray';

const router = Router();

router.get('/cert', getCert);
router.post('/sign', signData);
router.get('/sign', signData);  // Support GET as fallback

export default router;
