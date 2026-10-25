import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { 
  listStreams, 
  getStreamById, 
  createStream, 
  updateStream, 
  deleteStream, 
  getStreamLogs, 
  addAuditLog 
} from '../db';
import { probeMediaSource } from '../services/ffprobe';
import { streamingEngine } from '../services/streamingWorker';
import { CreateStreamSchema, UpdateStreamSchema, ValidateSourceSchema } from '@cloudcast/shared';

const router = Router();

// Validate source HLS/M3U8 URL (SSRF checked, FFprobe analyzed)
router.post('/validate-source', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = ValidateSourceSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const { sourceUrl, authHeader } = result.data;
  const probeResult = await probeMediaSource(sourceUrl, authHeader);
  res.json(probeResult);
});

// List all streams
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
  const streams = listStreams(req.user!.id, statusFilter);
  res.json({ streams });
});

// Create new stream
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = CreateStreamSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  // Auto-probe source URL if probeResult is not provided
  let probe = (req.body as any).probeResult;
  if (!probe || !probe.valid) {
    probe = await probeMediaSource(result.data.sourceUrl);
  }

  const stream = createStream({
    ...result.data,
    ownerId: req.user!.id,
    probeResult: probe
  });

  addAuditLog({
    userId: req.user!.id,
    action: 'STREAM_START',
    resourceType: 'STREAM',
    resourceId: stream.id,
    sanitizedMetadata: { event: 'CREATED', name: stream.name, sport: stream.sport }
  });

  res.status(201).json({ stream });
});

// Get stream by ID
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const stream = getStreamById(req.params.id, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }
  res.json({ stream });
});

// Update stream
router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = UpdateStreamSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const existing = getStreamById(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  if (existing.status === 'LIVE' || existing.status === 'STARTING') {
    res.status(409).json({ error: 'Cannot modify core configuration while broadcast is live. Please stop the stream first.' });
    return;
  }

  updateStream(req.params.id, result.data as any);
  const updated = getStreamById(req.params.id, req.user!.id);
  res.json({ stream: updated });
});

// Delete stream
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = getStreamById(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  if (existing.status === 'LIVE') {
    await streamingEngine.stopStream(existing.id, req.user!.id);
  }

  deleteStream(req.params.id, req.user!.id);

  addAuditLog({
    userId: req.user!.id,
    action: 'STREAM_STOP',
    resourceType: 'STREAM',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'DELETED', name: existing.name }
  });

  res.json({ success: true, message: 'Stream deleted successfully' });
});

// Start stream broadcast
router.post('/:id/start', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stream = getStreamById(req.params.id, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  if (stream.status === 'LIVE' || stream.status === 'STARTING') {
    res.status(409).json({ error: 'Stream is already broadcasting live' });
    return;
  }

  try {
    const scheduledStopAt = req.body.scheduledStopAt ? String(req.body.scheduledStopAt) : undefined;
    const job = await streamingEngine.startStream(stream.id, req.user!.id, scheduledStopAt);
    const updated = getStreamById(stream.id, req.user!.id);
    res.json({ success: true, message: 'Broadcast relay started', job, stream: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Stop stream broadcast
router.post('/:id/stop', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stream = getStreamById(req.params.id, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  try {
    await streamingEngine.stopStream(stream.id, req.user!.id);
    const updated = getStreamById(stream.id, req.user!.id);
    res.json({ success: true, message: 'Broadcast relay stopped', stream: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Restart stream broadcast
router.post('/:id/restart', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stream = getStreamById(req.params.id, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  try {
    const job = await streamingEngine.restartStream(stream.id, req.user!.id);
    const updated = getStreamById(stream.id, req.user!.id);
    res.json({ success: true, message: 'Broadcast relay restarted', job, stream: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get logs for stream
router.get('/:id/logs', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const stream = getStreamById(req.params.id, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  const logs = getStreamLogs(req.params.id, 100);
  res.json({ logs });
});

export default router;
