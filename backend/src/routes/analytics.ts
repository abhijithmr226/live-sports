import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getAnalyticsSummary } from '../db';
import { streamingEngine } from '../services/streamingWorker';
import { DatabaseSync } from 'node:sqlite';
import { CONFIG } from '../config';

const router = Router();
const db = new DatabaseSync(CONFIG.DATABASE_PATH);

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const summary = getAnalyticsSummary(req.user!.id);
  const workerHealth = streamingEngine.getWorkerHealth();

  // Fetch recent jobs history for charting
  const recentJobs = db.prepare(`
    SELECT j.id, j.streamId, s.name as streamName, s.sport, j.state, 
           j.startedAt, j.stoppedAt, j.currentUptimeSeconds, j.reconnectCount,
           j.currentFps, j.currentBitrateKbps
    FROM streaming_jobs j
    JOIN streams s ON j.streamId = s.id
    WHERE s.ownerId = ?
    ORDER BY j.createdAt DESC
    LIMIT 20
  `).all(req.user!.id);

  res.json({
    summary,
    worker: workerHealth,
    recentJobs
  });
});

router.get('/export-csv', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const jobs = db.prepare(`
    SELECT j.id, s.name as streamName, s.sport, d.name as destinationName,
           j.state, j.startedAt, j.stoppedAt, j.currentUptimeSeconds, j.reconnectCount, j.exitCode
    FROM streaming_jobs j
    JOIN streams s ON j.streamId = s.id
    LEFT JOIN destinations d ON s.destinationId = d.id
    WHERE s.ownerId = ?
    ORDER BY j.createdAt DESC
  `).all(req.user!.id) as any[];

  // Build CSV content
  const headers = ['Job ID', 'Stream Name', 'Sport', 'Destination', 'Status', 'Started At', 'Stopped At', 'Duration (Seconds)', 'Reconnections', 'Exit Code'];
  const rows = jobs.map(j => [
    `"${j.id}"`,
    `"${(j.streamName || '').replace(/"/g, '""')}"`,
    `"${j.sport || ''}"`,
    `"${(j.destinationName || '').replace(/"/g, '""')}"`,
    `"${j.state}"`,
    `"${j.startedAt || ''}"`,
    `"${j.stoppedAt || ''}"`,
    j.currentUptimeSeconds || 0,
    j.reconnectCount || 0,
    j.exitCode !== null ? j.exitCode : ''
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cloudcast_broadcast_analytics_${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
