import fs from 'fs';
import path from 'path';

const keysDir = path.join(__dirname, '../../keys');

// اقرأ الشهادة (public cert) كـ string
export const QZ_CERT = fs.readFileSync(
  path.join(keysDir, 'qz-cert.pem'),
  'utf8'
);

// اقرأ الـ private key كـ string
export const QZ_PRIVATE_KEY = fs.readFileSync(
  path.join(keysDir, 'qz-private-key.pem'),
  'utf8'
);
