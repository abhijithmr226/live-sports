import { CONFIG } from './config';
import { spawn } from 'child_process';

console.log(`[CloudCast Dedicated Worker] Initializing worker node: ${CONFIG.WORKER_ID}`);
console.log(`[CloudCast Dedicated Worker] Checking FFmpeg installation...`);

const test = spawn(CONFIG.FFMPEG_PATH, ['-version']);
test.stdout.on('data', (d) => {
  const line = d.toString().split('\n')[0];
  console.log(`[CloudCast Dedicated Worker] Ready with ${line}`);
});

test.on('error', (err) => {
  console.error('[CloudCast Dedicated Worker] Error finding FFmpeg binary:', err.message);
});

export const workerStatus = {
  id: CONFIG.WORKER_ID,
  active: true,
  startedAt: new Date().toISOString()
};
