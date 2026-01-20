/**
 * Cryptographic Primitives for Credential System
 *
 * Ed25519 signing for credentials
 * All credentials are cryptographically signed by issuing gatekeeper
 */

import * as crypto from 'crypto';

/**
 * Key pair (Ed25519)
 */
export interface KeyPair {
  publicKey: string;   // Base64 encoded
  privateKey: string;  // Base64 encoded
}

/**
 * Generate new Ed25519 key pair
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'der',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
    },
  });

  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
  };
}

/**
 * Sign data with private key
 */
export function sign(data: string, privateKeyBase64: string): string {
  const privateKeyDer = Buffer.from(privateKeyBase64, 'base64');

  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: 'der',
    type: 'pkcs8',
  });

  const signature = crypto.sign(null, Buffer.from(data, 'utf8'), privateKey);
  return signature.toString('base64');
}

/**
 * Verify signature with public key
 */
export function verify(data: string, signatureBase64: string, publicKeyBase64: string): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');

    const publicKey = crypto.createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });

    const signature = Buffer.from(signatureBase64, 'base64');

    return crypto.verify(null, Buffer.from(data, 'utf8'), publicKey, signature);
  } catch (error) {
    return false;
  }
}

/**
 * Hash data with SHA-256
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = ''): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}-${randomBytes}` : randomBytes;
}

/**
 * Derive deterministic coordinate from content hash
 * Used for hash-based coordinate generation
 */
export function hashToCoordinate(data: string): { ra: number; dec: number; alt: number } {
  const hashValue = hash(data);

  // Use different parts of hash for each coordinate
  const raPart = hashValue.substring(0, 8);
  const decPart = hashValue.substring(8, 16);
  const altPart = hashValue.substring(16, 24);

  // Convert hex to numbers in appropriate ranges
  const ra = (parseInt(raPart, 16) % 36000) / 100;  // 0-360 degrees
  const dec = ((parseInt(decPart, 16) % 18000) / 100) - 90;  // -90 to +90 degrees
  const alt = (parseInt(altPart, 16) % 2000) / 100;  // 0-20 light-years

  return { ra, dec, alt };
}

/**
 * Encrypt data with AES-256-GCM
 * For pocket storage credentials
 */
export function encrypt(plaintext: string, keyBase64: string): { ciphertext: string; iv: string; authTag: string } {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);  // GCM standard is 12 bytes

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(ciphertext: string, keyBase64: string, ivBase64: string, authTagBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Generate encryption key (32 bytes for AES-256)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Time-safe string comparison (prevents timing attacks)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
