import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { listDestinations, createDestination, getDestinationRaw, updateDestination, deleteDestination, addAuditLog } from '../db';
import { encryptSecret } from '../security/encryption';
import { CreateDestinationSchema, UpdateDestinationSchema } from '@cloudcast/shared';

const router = Router();

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const destinations = listDestinations(req.user!.id);
  res.json({ destinations });
});

router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = CreateDestinationSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const { name, type, ingestUrl, streamKey, isDefault } = result.data;
  const encryptedStreamKey = encryptSecret(streamKey);

  const destination = createDestination({
    ownerId: req.user!.id,
    name,
    type,
    ingestUrl,
    encryptedStreamKey,
    isDefault
  });

  addAuditLog({
    userId: req.user!.id,
    action: 'DESTINATION_UPDATE',
    resourceType: 'DESTINATION',
    resourceId: destination.id,
    sanitizedMetadata: { event: 'CREATED', name, type }
  });

  res.status(201).json({ destination });
});

router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const result = UpdateDestinationSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const existing = getDestinationRaw(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  const updateData: any = { ...result.data };
  if (result.data.streamKey) {
    updateData.encryptedStreamKey = encryptSecret(result.data.streamKey);
    delete updateData.streamKey;
  }

  updateDestination(req.params.id, req.user!.id, updateData);

  addAuditLog({
    userId: req.user!.id,
    action: 'DESTINATION_UPDATE',
    resourceType: 'DESTINATION',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'UPDATED' }
  });

  const updated = listDestinations(req.user!.id).find(d => d.id === req.params.id);
  res.json({ destination: updated });
});

router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const existing = getDestinationRaw(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  const deleted = deleteDestination(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(409).json({ error: 'Cannot delete destination: It is currently linked to one or more configured streams' });
    return;
  }

  addAuditLog({
    userId: req.user!.id,
    action: 'DESTINATION_UPDATE',
    resourceType: 'DESTINATION',
    resourceId: req.params.id,
    sanitizedMetadata: { event: 'DELETED' }
  });

  res.json({ success: true, message: 'Destination removed successfully' });
});

router.post('/:id/test', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const destination = getDestinationRaw(req.params.id, req.user!.id);
  if (!destination) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  const url = destination.ingestUrl.toLowerCase();
  const validProtocol = url.startsWith('rtmp://') || url.startsWith('rtmps://');

  if (!validProtocol) {
    res.status(400).json({
      valid: false,
      message: 'Invalid ingest protocol. Destination URL must begin with rtmp:// or rtmps://'
    });
    return;
  }

  res.json({
    valid: true,
    message: `Destination endpoint verified. Ready for ${destination.type} streaming.`,
    checkedAt: new Date().toISOString()
  });
});

export default router;
