import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encryptSecret, decryptSecret, maskSecret } from '../security/encryption';
import { redactSecrets } from '../security/redact';

describe('Security & Cryptography Modules', () => {
  it('should encrypt and decrypt secrets identically using AES-256-GCM', () => {
    const streamKey = 'live_9837421_xY99qwerLKJ123456';
    const encrypted = encryptSecret(streamKey);

    assert.notStrictEqual(encrypted, streamKey);
    assert.strictEqual(encrypted.split(':').length, 3, 'Payload format must be iv:tag:ciphertext');

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, streamKey);
  });

  it('should mask sensitive stream keys for UI presentation without exposing key body', () => {
    const rawKey = 'yt_live_control_room_secret_key_8842';
    const masked = maskSecret(rawKey);

    assert.strictEqual(masked.includes('8842'), true);
    assert.strictEqual(masked.includes('yt_live_control_room'), false);
    assert.strictEqual(masked.startsWith('••••'), true);
  });

  it('should redact RTMP destination stream keys from command strings and logs', () => {
    const logMsg = 'Connecting to rtmp://a.rtmp.youtube.com/live2/abcd-1234-wxyz-9876 with stream copy';
    const redacted = redactSecrets(logMsg);

    assert.strictEqual(redacted.includes('abcd-1234-wxyz-9876'), false);
    assert.strictEqual(redacted.includes('[REDACTED_STREAM_KEY]'), true);
  });

  it('should redact authorization headers and query string tokens from log entries', () => {
    const rawLog = 'HTTP probe request Authorization: Bearer secret-auth-token-123 to https://cdn.sports.com/live?token=supersecretkey';
    const redacted = redactSecrets(rawLog);

    assert.strictEqual(redacted.includes('secret-auth-token-123'), false);
    assert.strictEqual(redacted.includes('supersecretkey'), false);
    assert.strictEqual(redacted.includes('[REDACTED]'), true);
  });
});
