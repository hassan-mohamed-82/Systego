import { Request, Response } from 'express';
import crypto from 'crypto';
import { QZ_CERT, QZ_PRIVATE_KEY } from '../../utils/Qztray';

// GET /api/admin/qztray/cert
export const getCert = (req: Request, res: Response) => {
  try {
    res.type('text/plain').send(QZ_CERT);
  } catch (err) {
    console.error('QZ cert error:', err);
    res.status(500).send('Certificate error');
  }
};

// POST /api/admin/qztray/sign
export const signData = (req: Request, res: Response) => {
  // Support both POST body and GET query
  const data = req.body?.data || req.query?.data || req.query?.request;

  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid data parameter' });
  }

  try {
    const signer = crypto.createSign('SHA512');
    signer.update(data);
    signer.end();

    const signature = signer.sign(QZ_PRIVATE_KEY, 'base64');

    res.type('text/plain').send(signature);
  } catch (err) {
    console.error('QZ sign error:', err);
    res.status(500).send('Signature error');
  }
};
