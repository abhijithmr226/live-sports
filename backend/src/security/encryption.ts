import crypto from 'crypto';
import { CONFIG } from '../config';

// 32-byte key derived from hex string or hashed
function getKey(): Buffer {
  const hex = CONFIG.ENCRYPTION_KEY.trim();
  if (hex.length === 64) {
    return Buffer.from(hex, 'hex');
  }
  // Fallback: SHA-256 hash of the secret string
  return crypto.createHash('sha256').update(hex).digest();
}

/**
 * Encrypt sensitive text (such as RTMP stream keys or source credentials) using AES-256-GCM.
 * Output format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt sensitive text encrypted with encryptSecret.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    // If it's legacy unencrypted or invalid, return as is safely
    return encryptedPayload;
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask a secret for safe display on UI / API responses.
 * Never exposes the raw key to the browser.
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 4) {
    return '••••••••';
  }
  const lastFour = secret.slice(-4);
  return `••••••••••••${lastFour}`;
}
