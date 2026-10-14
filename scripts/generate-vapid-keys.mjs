import { webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function generateVapidKeys() {
  const keys = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicKey = Buffer.from(await webcrypto.subtle.exportKey('raw', keys.publicKey))
    .toString('base64url');
  const privateJwk = await webcrypto.subtle.exportKey('jwk', keys.privateKey);

  if (!privateJwk.d || Buffer.from(publicKey, 'base64url').length !== 65) {
    throw new Error('Failed to generate valid P-256 VAPID keys');
  }

  return { publicKey, privateKey: privateJwk.d };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { publicKey, privateKey } = await generateVapidKeys();
  console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`);
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
}
