import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  findUserByEmail, 
  createUser, 
  listDestinations, 
  createDestination, 
  listStreams, 
  createStream, 
  updateStreamStatus,
  addAuditLog,
  getAuditLogs
} from '../db';
import { encryptSecret } from '../security/encryption';

describe('Database Persistence Layer & Audit Trail', () => {
  it('should verify seeded default administrator exists', () => {
    const admin = findUserByEmail('admin@cloudcast.studio');
    assert.ok(admin, 'Default administrator account should be seeded');
    assert.strictEqual(admin.role, 'ADMIN');
  });

  it('should create and retrieve new users', () => {
    const email = `operator_${Date.now()}@broadcast.tv`;
    const user = createUser({
      email,
      name: 'Match Operator',
      passwordHash: 'dummy_hash_for_test'
    });

    assert.ok(user.id);
    assert.strictEqual(user.email, email);

    const fetched = findUserByEmail(email);
    assert.ok(fetched);
    assert.strictEqual(fetched.name, 'Match Operator');
  });

  it('should store encrypted destinations and retrieve masked stream keys', () => {
    const admin = findUserByEmail('admin@cloudcast.studio')!;
    const encryptedKey = encryptSecret('custom_rtmp_secret_pass_1234');

    const dest = createDestination({
      ownerId: admin.id,
      name: 'Secondary Twitch / RTMP Backup',
      type: 'CUSTOM_RTMP',
      ingestUrl: 'rtmp://live.twitch.tv/app',
      encryptedStreamKey: encryptedKey
    });

    assert.ok(dest.id);
    assert.strictEqual(dest.maskedStreamKey.includes('custom_rtmp_secret'), false);

    const list = listDestinations(admin.id);
    assert.ok(list.some(d => d.id === dest.id));
  });

  it('should record audit trail logs for administrative operations', () => {
    const admin = findUserByEmail('admin@cloudcast.studio')!;
    addAuditLog({
      userId: admin.id,
      action: 'STREAM_START',
      resourceType: 'STREAM',
      resourceId: 'test_stream_id_101',
      sanitizedMetadata: { testRun: true }
    });

    const logs = getAuditLogs(admin.id, 10);
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[0].action, 'STREAM_START');
  });
});
