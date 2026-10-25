import dns from 'dns';
import { URL } from 'url';

function isIPv4Literal(str: string): boolean {
  const parts = str.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

function isPrivateIPv4(ip: string): boolean {
  if (!isIPv4Literal(ip)) return false;
  const parts = ip.split('.').map(p => parseInt(p, 10));

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private Network)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private Network: 172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private Network)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-Local, AWS/GCP/Azure instance metadata: 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

  // Broadcast
  if (ip === '255.255.255.255') return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  // Only check if it contains colon (IPv6 syntax)
  if (!ip.includes(':')) return false;
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // Link local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // IPv4 mapped into IPv6 (::ffff:192.168.1.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.replace('::ffff:', '');
    return isPrivateIPv4(ipv4);
  }
  return false;
}

/**
 * Validates a user-supplied URL to protect against Server-Side Request Forgery (SSRF).
 * Allows test URLs in development if explicitly configured, but blocks internal/metadata targets.
 */
export async function validateUrlForSSRF(urlString: string): Promise<{ allowed: boolean; reason?: string; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }

  // Enforce supported broadcast protocols (HTTP, HTTPS, RTMP, RTMPS, RTSP, SRT, UDP)
  const allowedProtocols = ['http:', 'https:', 'rtmp:', 'rtmps:', 'rtsp:', 'srt:', 'udp:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return { 
      allowed: false, 
      reason: `Unsupported protocol: ${parsed.protocol}. Allowed media protocols: ${allowedProtocols.join(', ')}` 
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and common local domain names
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { allowed: false, reason: 'Access to localhost and internal hostnames is prohibited' };
  }

  // Block direct private IP literals
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    return { allowed: false, reason: 'Direct connection to private or loopback IP addresses is prohibited' };
  }

  // Resolve hostname via DNS
  try {
    const lookupResult = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { allowed: false, reason: 'DNS resolution returned no valid addresses' };
    }

    for (const record of lookupResult) {
      const ip = record.address;
      if (record.family === 4) {
        if (isPrivateIPv4(ip)) {
          return { allowed: false, reason: `Hostname resolved to prohibited private IPv4 address (${ip})`, resolvedIp: ip };
        }
      } else if (record.family === 6) {
        if (isPrivateIPv6(ip)) {
          return { allowed: false, reason: `Hostname resolved to prohibited private IPv6 address (${ip})`, resolvedIp: ip };
        }
      }
    }

    return { allowed: true, resolvedIp: lookupResult[0].address };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { allowed: false, reason: `DNS resolution failed: ${msg}` };
  }
}
