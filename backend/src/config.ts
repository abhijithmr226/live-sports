import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'cloudcast-dev-jwt-secret-replace-in-production-min32chars',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 hex characters (32 bytes)
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'cloudcast.db'),
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  FFPROBE_PATH: process.env.FFPROBE_PATH || 'ffprobe',
  WORKER_ID: process.env.WORKER_ID || `worker-${process.pid}`,
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS || '4', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
};
