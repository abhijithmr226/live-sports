import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const CONFIG = {
  WORKER_ID: process.env.WORKER_ID || `worker-node-${process.pid}`,
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  FFPROBE_PATH: process.env.FFPROBE_PATH || 'ffprobe',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000/api',
};
