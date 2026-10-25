import { spawn } from 'child_process';
import { CONFIG } from '../config';
import { StreamProbeResult } from '@cloudcast/shared';
import { validateUrlForSSRF } from '../security/ssrf';
import { redactSecrets } from '../security/redact';

/**
 * Probes an HLS, M3U8, or media stream URL using FFprobe.
 * Enforces SSRF validation, passes arguments safely without a shell,
 * and extracts video/audio telemetry.
 */
export async function probeMediaSource(sourceUrl: string, authHeader?: string): Promise<StreamProbeResult> {
  // 1. SSRF check
  const ssrfCheck = await validateUrlForSSRF(sourceUrl);
  if (!ssrfCheck.allowed) {
    return {
      valid: false,
      error: `Security Check Blocked: ${ssrfCheck.reason}`,
      probedAt: new Date().toISOString()
    };
  }

  // 2. Build FFprobe arguments safely as array
  const args: string[] = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-analyzeduration', '5000000', // 5 seconds analyze limit
    '-probesize', '5000000'
  ];

  if (authHeader && authHeader.trim()) {
    args.push('-headers', `Authorization: ${authHeader.trim()}\r\n`);
  }

  args.push(sourceUrl);

  return new Promise<StreamProbeResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(CONFIG.FFPROBE_PATH, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      resolve({
        valid: false,
        error: 'Probe timed out after 10 seconds. The remote stream is not responding.',
        probedAt: new Date().toISOString()
      });
    }, 10000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!timedOut) {
        resolve({
          valid: false,
          error: `Failed to execute FFprobe: ${redactSecrets(err.message)}`,
          probedAt: new Date().toISOString()
        });
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        const errorMsg = stderr || `FFprobe process exited with code ${code}`;
        resolve({
          valid: false,
          error: redactSecrets(errorMsg).trim(),
          probedAt: new Date().toISOString()
        });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const streams = data.streams || [];
        const format = data.format || {};

        const videoStream = streams.find((s: any) => s.codec_type === 'video');
        const audioStream = streams.find((s: any) => s.codec_type === 'audio');

        if (!videoStream && !audioStream) {
          resolve({
            valid: false,
            error: 'No valid video or audio streams detected in media playlist.',
            probedAt: new Date().toISOString()
          });
          return;
        }

        // Calculate FPS from r_frame_rate e.g. "60/1" or "30000/1001"
        let fps: number | undefined;
        if (videoStream?.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
            fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
          }
        }

        const bitrateKbps = format.bit_rate 
          ? Math.round(parseInt(format.bit_rate, 10) / 1000)
          : videoStream?.bit_rate 
            ? Math.round(parseInt(videoStream.bit_rate, 10) / 1000)
            : undefined;

        resolve({
          valid: true,
          format: format.format_name,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          width: videoStream?.width,
          height: videoStream?.height,
          fps,
          bitrateKbps,
          audioChannels: audioStream?.channels,
          sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
          probedAt: new Date().toISOString()
        });
      } catch (parseErr: unknown) {
        resolve({
          valid: false,
          error: `Failed to parse FFprobe response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          probedAt: new Date().toISOString()
        });
      }
    });
  });
}
