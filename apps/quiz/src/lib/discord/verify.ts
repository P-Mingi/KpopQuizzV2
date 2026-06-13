import crypto from 'node:crypto';

// Verify a Discord interaction request's Ed25519 signature using the app's
// public key. No external dependency: Node's crypto verifies Ed25519 once the
// raw 32-byte public key is wrapped in its SPKI DER prefix.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function verifyDiscordRequest(
  rawBody: string,
  signatureHex: string,
  timestamp: string,
  publicKeyHex: string,
): boolean {
  if (!signatureHex || !timestamp || !publicKeyHex) return false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signatureHex, 'hex'),
    );
  } catch {
    return false;
  }
}
