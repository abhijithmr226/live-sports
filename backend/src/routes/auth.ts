import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';
import { findUserByEmail, findUserById, createUser, updateUserPassword, addAuditLog } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { RegisterSchema, LoginSchema, ChangePasswordSchema } from '@cloudcast/shared';

const router = Router();

router.post('/register', async (req, res): Promise<void> => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const { email, password, name } = result.data;
  const existing = findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ email, passwordHash, name });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, CONFIG.JWT_SECRET, { expiresIn: '7d' });

  addAuditLog({
    userId: user.id,
    action: 'AUTH_EVENT',
    resourceType: 'USER',
    resourceId: user.id,
    sanitizedMetadata: { event: 'REGISTER' }
  });

  res.status(201).json({ user, token });
});

router.post('/login', async (req, res): Promise<void> => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const { email, password } = result.data;
  const user = findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, CONFIG.JWT_SECRET, { expiresIn: '7d' });

  addAuditLog({
    userId: user.id,
    action: 'AUTH_EVENT',
    resourceType: 'USER',
    resourceId: user.id,
    sanitizedMetadata: { event: 'LOGIN' }
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user) {
    addAuditLog({
      userId: req.user.id,
      action: 'AUTH_EVENT',
      resourceType: 'USER',
      resourceId: req.user.id,
      sanitizedMetadata: { event: 'LOGOUT' }
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

router.patch('/password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = ChangePasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    return;
  }

  const user = findUserByEmail(req.user!.email);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const match = await bcrypt.compare(result.data.currentPassword, user.passwordHash);
  if (!match) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(result.data.newPassword, 10);
  updateUserPassword(user.id, newHash);

  addAuditLog({
    userId: user.id,
    action: 'AUTH_EVENT',
    resourceType: 'USER',
    resourceId: user.id,
    sanitizedMetadata: { event: 'PASSWORD_CHANGED' }
  });

  res.json({ success: true, message: 'Password updated successfully' });
});

export default router;
