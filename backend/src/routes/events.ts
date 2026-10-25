import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { listEvents, getEventById, createEvent, updateEvent, deleteEvent, addAuditLog } from '../db';
import { CreateEventSchema, UpdateEventSchema } from '@cloudcast/shared';

const router = Router();

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const events = listEvents(req.user!.id, search);
  res.json({ events });
});

router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = CreateEventSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const event = createEvent({
    ...result.data,
    ownerId: req.user!.id
  });

  addAuditLog({
    userId: req.user!.id,
    action: 'EVENT_MODIFIED',
    resourceType: 'EVENT',
    resourceId: event.id,
    sanitizedMetadata: { event: 'CREATED', title: event.title, sport: event.sport }
  });

  res.status(201).json({ event });
});

router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const event = getEventById(req.params.id);
  if (!event || event.ownerId !== req.user!.id) {
    res.status(404).json({ error: 'Sports event not found' });
    return;
  }
  res.json({ event });
});

router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = UpdateEventSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const existing = getEventById(req.params.id);
  if (!existing || existing.ownerId !== req.user!.id) {
    res.status(404).json({ error: 'Sports event not found' });
    return;
  }

  updateEvent(req.params.id, req.user!.id, result.data as any);

  addAuditLog({
    userId: req.user!.id,
    action: 'EVENT_MODIFIED',
    resourceType: 'EVENT',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'UPDATED' }
  });

  const updated = getEventById(req.params.id);
  res.json({ event: updated });
});

router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const existing = getEventById(req.params.id);
  if (!existing || existing.ownerId !== req.user!.id) {
    res.status(404).json({ error: 'Sports event not found' });
    return;
  }

  deleteEvent(req.params.id, req.user!.id);

  addAuditLog({
    userId: req.user!.id,
    action: 'EVENT_MODIFIED',
    resourceType: 'EVENT',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'DELETED' }
  });

  res.json({ success: true, message: 'Event deleted successfully' });
});

export default router;
