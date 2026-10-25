/**
 * Sanitizes and redacts sensitive information from log lines, command strings, and error messages.
 * Prevents credentials, stream keys, or bearer tokens from appearing in telemetry or storage.
 */
export function redactSecrets(message: string): string {
  if (!message || typeof message !== 'string') return message;

  let cleaned = message;

  // Redact RTMP stream keys: rtmp://host:port/app/KEY -> rtmp://host:port/app/[REDACTED_STREAM_KEY]
  cleaned = cleaned.replace(
    /(rtmps?:\/\/[^\s\/]+\/[^\s\/]+\/)([\w\-~.]+)/gi,
    '$1[REDACTED_STREAM_KEY]'
  );

  // Redact URL query tokens / keys (token=..., key=..., auth=..., signature=..., secret=...)
  cleaned = cleaned.replace(
    /([?&](?:token|key|stream_key|auth|signature|secret|access_token|password)=)([^&\s]+)/gi,
    '$1[REDACTED]'
  );

  // Redact Authorization headers: Bearer xyz or Basic xyz
  cleaned = cleaned.replace(
    /(Authorization:\s*(?:Bearer|Basic)\s+)([^\s\r\n]+)/gi,
    '$1[REDACTED]'
  );

  return cleaned;
}
