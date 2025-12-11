import { Request, Response } from 'express';
import crypto from 'crypto';
import { QZ_CERT, QZ_PRIVATE_KEY } from '../../utils/Qztray';

// GET /qz/cert
export const getCert = (req: Request, res: Response) => {
  res.type('text/plain').send(QZ_CERT);
};

// POST /qz/sign
export const signData = (req: Request, res: Response) => {
  const { data } = req.body as { data?: string };

  if (!data) {
    return res.status(400).send('Missing data');
  }

  try {
    const signer = crypto.createSign('sha256');
    signer.update(data);
    signer.end();

    const signature = signer.sign(QZ_PRIVATE_KEY, 'base64');

    res.type('text/plain').send(signature);
  } catch (err) {
    console.error(err);
    res.status(500).send('sign error');
  }
};