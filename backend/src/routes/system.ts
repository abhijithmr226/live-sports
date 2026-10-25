import { Router, Request, Response } from 'express';
import { streamingEngine } from '../services/streamingWorker';
import { requireAuth, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { CONFIG } from '../config';

const router = Router();

router.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    service: 'CloudCast Sports Studio Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version
  });
});

router.get('/workers/status', requireAuth, (_req: AuthenticatedRequest, res: Response): void => {
  const health = streamingEngine.getWorkerHealth();
  res.json({ health });
});

router.get('/settings', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    settings: {
      ffmpegPath: CONFIG.FFMPEG_PATH,
      ffprobePath: CONFIG.FFPROBE_PATH,
      maxConcurrentJobs: CONFIG.MAX_CONCURRENT_JOBS,
      workerId: CONFIG.WORKER_ID,
      corsOrigin: CONFIG.CORS_ORIGIN,
      nodeEnv: CONFIG.NODE_ENV
    }
  });
});

export default router;
