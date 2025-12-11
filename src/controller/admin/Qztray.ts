// src/controllers/qz.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { QZ_CERT, QZ_PRIVATE_KEY } from '../../utils/Qztray';

// GET /qz/cert
export const getCert = (req: Request, res: Response) => {
  res.type('text/plain').send(QZ_CERT);
};

// POST /qz/sign
export const signData = (req: Request, res: Response) => {
  // لو POST هتيجي من body.data
  // لو GET هتيجي من query.data أو query.request
  const dataFromBody = (req.body as any)?.data;
  const dataFromQuery = (req.query.data || req.query.request) as string | undefined;
  const data = dataFromBody || dataFromQuery;

  if (!data) {
    return res.status(400).send('Missing data');
  }

  try {
    const signer = crypto.createSign('sha512'); // متوافق مع qz.security.setSignatureAlgorithm("SHA512")
    signer.update(data);
    signer.end();

    const signature = signer.sign(QZ_PRIVATE_KEY, 'base64');

    res.type('text/plain').send(signature);
  } catch (err) {
    console.error('QZ sign error:', err);
    res.status(500).send('sign error');
  }
};
