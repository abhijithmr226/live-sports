import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { listSchedules, createSchedule, updateSchedule, deleteSchedule, addAuditLog, getStreamById } from '../db';
import { CreateScheduleSchema, UpdateScheduleSchema } from '@cloudcast/shared';

const router = Router();

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const schedules = listSchedules(req.user!.id);
  res.json({ schedules });
});

router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = CreateScheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const stream = getStreamById(result.data.streamId, req.user!.id);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  const schedule = createSchedule({
    streamId: result.data.streamId,
    startTime: result.data.startTime,
    stopTime: result.data.stopTime || null,
    timezone: result.data.timezone,
    recurrence: result.data.recurrence,
    selectedDays: result.data.selectedDays,
    enabled: result.data.enabled
  });

  addAuditLog({
    userId: req.user!.id,
    action: 'SCHEDULE_CHANGE',
    resourceType: 'SCHEDULE',
    resourceId: schedule.id,
    sanitizedMetadata: { event: 'CREATED', streamId: stream.id, startTime: schedule.startTime }
  });

  res.status(201).json({ schedule });
});

router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = UpdateScheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  updateSchedule(req.params.id, result.data as any);

  addAuditLog({
    userId: req.user!.id,
    action: 'SCHEDULE_CHANGE',
    resourceType: 'SCHEDULE',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'UPDATED' }
  });

  res.json({ success: true, message: 'Schedule updated successfully' });
});

router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  deleteSchedule(req.params.id);

  addAuditLog({
    userId: req.user!.id,
    action: 'SCHEDULE_CHANGE',
    resourceType: 'SCHEDULE',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'DELETED' }
  });

  res.json({ success: true, message: 'Schedule deleted successfully' });
});

export default router;
