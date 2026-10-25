import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateUrlForSSRF } from '../security/ssrf';

describe('SSRF Protection Guard', () => {
  it('should block localhost addresses', async () => {
    const res = await validateUrlForSSRF('http://localhost:8080/stream.m3u8');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /localhost/i);
  });

  it('should block 127.0.0.1 loopback', async () => {
    const res = await validateUrlForSSRF('http://127.0.0.1:8000/live.m3u8');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /private or loopback/i);
  });

  it('should block AWS/GCP metadata service IP (169.254.169.254)', async () => {
    const res = await validateUrlForSSRF('http://169.254.169.254/latest/meta-data/');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /private or loopback/i);
  });

  it('should block 10.x.x.x private class A network', async () => {
    const res = await validateUrlForSSRF('http://10.0.1.5:8080/feed.m3u8');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /private or loopback/i);
  });

  it('should block 192.168.x.x private class C network', async () => {
    const res = await validateUrlForSSRF('http://192.168.1.100/video/playlist.m3u8');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /private or loopback/i);
  });

  it('should block dangerous non-HTTP protocols (file:, ftp:, etc)', async () => {
    const res = await validateUrlForSSRF('file:///etc/passwd');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason || '', /unsupported protocol/i);
  });

  it('should allow legitimate public internet URLs', async () => {
    const res = await validateUrlForSSRF('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    assert.strictEqual(res.allowed, true);
    assert.ok(res.resolvedIp, 'Must have resolved public IP');
  });
});
