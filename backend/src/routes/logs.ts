import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getAllLogs, getAuditLogs } from '../db';

const router = Router();

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string || '200', 10);
  const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
  const logs = getAllLogs(limit, severity);
  res.json({ logs });
});

router.get('/audit', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string || '100', 10);
  const auditLogs = getAuditLogs(req.user!.role === 'ADMIN' ? undefined : req.user!.id, limit);
  res.json({ auditLogs });
});

router.get('/download', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const logs = getAllLogs(500);
  const formatted = logs.map(l => `[${l.timestamp}] [${l.severity}] [${l.eventType}] (Stream: ${l.streamId}, Job: ${l.jobId || 'N/A'}): ${l.message}`).join('\r\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="cloudcast_system_logs_${Date.now()}.txt"`);
  res.send(formatted);
});

export default router;
