// Bunnyverse Cards, lot 4: the owner's one-time VAPID key pair for the "Notify me" push. Run once, paste the lines into Vercel yourself:
//   node apps/quiz/scripts/cards/vapid-keys.mjs
// It prints the env lines and writes no file. Keep the private key secret (Vercel only, never in git, never in a chat).
// CARDS_VAPID_SUBJECT is a mailto: or https: address the push services can reach if the sender misbehaves: fill it in.
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const priv = privateKey.export({ format: 'jwk' });
const pub = publicKey.export({ format: 'jwk' });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]).toString('base64url');

console.log(`CARDS_VAPID_PUBLIC_KEY=${raw}`);
console.log(`NEXT_PUBLIC_CARDS_VAPID_PUBLIC_KEY=${raw}`);
console.log(`CARDS_VAPID_PRIVATE_KEY=${priv.d}`);
console.log('CARDS_VAPID_SUBJECT=mailto:YOUR-ADDRESS-HERE');
