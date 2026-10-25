import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config';
import { decryptSecret, maskSecret } from '../security/encryption';
import { 
  User, 
  Stream, 
  Destination, 
  Schedule, 
  StreamingJob, 
  SportsEvent, 
  StreamLog, 
  AuditLog,
  StreamStatus,
  JobState
} from '@cloudcast/shared';

// Initialize SQLite database instance
const db = new DatabaseSync(CONFIG.DATABASE_PATH);

// Configure WAL mode and foreign keys for durability and performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// Run migrations / create tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OPERATOR',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      ingestUrl TEXT NOT NULL,
      encryptedStreamKey TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      title TEXT NOT NULL,
      sport TEXT NOT NULL,
      competition TEXT NOT NULL,
      homeTeam TEXT NOT NULL,
      awayTeam TEXT NOT NULL,
      venue TEXT,
      startTime TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      thumbnailUrl TEXT,
      broadcastNotes TEXT,
      publicWatchEnabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sport TEXT NOT NULL,
      eventId TEXT,
      sourceUrl TEXT NOT NULL,
      sourceNotes TEXT,
      destinationId TEXT NOT NULL,
      outputProfileJson TEXT NOT NULL,
      probeResultJson TEXT,
      status TEXT NOT NULL DEFAULT 'IDLE',
      currentJobId TEXT,
      tagsJson TEXT,
      thumbnailUrl TEXT,
      internalNotes TEXT,
      isPublicWatchEnabled INTEGER NOT NULL DEFAULT 0,
      publicWatchSlug TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (destinationId) REFERENCES destinations(id) ON DELETE RESTRICT,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      streamId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      stopTime TEXT,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence TEXT NOT NULL DEFAULT 'ONCE',
      selectedDaysJson TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      lastExecution TEXT,
      nextExecution TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (streamId) REFERENCES streams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streaming_jobs (
      id TEXT PRIMARY KEY,
      streamId TEXT NOT NULL,
      scheduleId TEXT,
      workerId TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'QUEUED',
      startedAt TEXT,
      stoppedAt TEXT,
      scheduledStopAt TEXT,
      exitCode INTEGER,
      errorSummary TEXT,
      reconnectCount INTEGER NOT NULL DEFAULT 0,
      totalBytesSent INTEGER DEFAULT 0,
      currentFps REAL DEFAULT 0,
      currentBitrateKbps REAL DEFAULT 0,
      currentDropFrames INTEGER DEFAULT 0,
      currentUptimeSeconds INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (streamId) REFERENCES streams(id) ON DELETE CASCADE,
      FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stream_logs (
      id TEXT PRIMARY KEY,
      streamId TEXT NOT NULL,
      jobId TEXT,
      severity TEXT NOT NULL,
      eventType TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (streamId) REFERENCES streams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      action TEXT NOT NULL,
      resourceType TEXT NOT NULL,
      resourceId TEXT NOT NULL,
      sanitizedMetadataJson TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_streams_owner ON streams(ownerId);
    CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
    CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
    CREATE INDEX IF NOT EXISTS idx_streaming_jobs_state ON streaming_jobs(state);
    CREATE INDEX IF NOT EXISTS idx_stream_logs_stream ON stream_logs(streamId);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(userId);
  `);

  // Seed default demo / admin account if no users exist
  const countUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (countUsers === 0) {
    const adminId = 'usr_admin_001';
    const passwordHash = bcrypt.hashSync('admin123456', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, passwordHash, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin@cloudcast.studio', passwordHash, 'Studio Director', 'ADMIN', now);

    // Seed default YouTube Live & RTMP destination
    const destId = 'dest_yt_default';
    db.prepare(`
      INSERT INTO destinations (id, ownerId, name, type, ingestUrl, encryptedStreamKey, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      destId, 
      adminId, 
      'Primary YouTube Live Control Room', 
      'YOUTUBE', 
      'rtmp://a.rtmp.youtube.com/live2', 
      'placeholder_encrypted_key', 
      now, 
      now
    );

    // Seed sample upcoming sports event
    const eventId = 'evt_champions_final';
    db.prepare(`
      INSERT INTO events (id, ownerId, title, sport, competition, homeTeam, awayTeam, venue, startTime, timezone, status, broadcastNotes, publicWatchEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      eventId,
      adminId,
      'UEFA Champions League Semi-Final: Real Madrid vs Bayern Munich',
      'FOOTBALL',
      'UEFA Champions League',
      'Real Madrid',
      'Bayern Munich',
      'Santiago Bernabéu, Madrid',
      new Date(Date.now() + 3600 * 4 * 1000).toISOString(),
      'UTC',
      'UPCOMING',
      'High priority 1080p60 primary broadcast feed with live graphics relay',
      now,
      now
    );

    // Seed a sample ready-to-test stream with official public Big Buck Bunny / Apple test HLS stream
    const streamId = 'strm_demo_001';
    const outputProfile = JSON.stringify({
      mode: 'COPY',
      resolution: 'source',
      videoBitrate: 4500,
      audioBitrate: 128,
      fps: 60,
      videoCodec: 'copy',
      audioCodec: 'copy',
      keyframeIntervalSeconds: 2,
      preset: 'veryfast'
    });

    db.prepare(`
      INSERT INTO streams (id, ownerId, name, description, sport, eventId, sourceUrl, sourceNotes, destinationId, outputProfileJson, status, tagsJson, isPublicWatchEnabled, publicWatchSlug, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, 1, 'ucl-semi-final', ?, ?)
    `).run(
      streamId,
      adminId,
      'Main Stadium Feed - Camera 1',
      'Direct pitch-side primary broadcast angle for Champions League Semi-Final',
      'FOOTBALL',
      eventId,
      'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      'Authorized Mux multi-bitrate HLS test stream',
      destId,
      outputProfile,
      JSON.stringify(['1080p', 'champions-league', 'football']),
      now,
      now
    );
  }
}

// ----------------- USER REPOSITORY -----------------

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt
  };
}

export function findUserById(id: string): User | null {
  const row = db.prepare('SELECT id, email, name, role, createdAt FROM users WHERE id = ?').get(id) as any;
  if (!row) return null;
  return row as User;
}

export function createUser(data: { email: string; passwordHash: string; name: string; role?: string }): User {
  const id = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  const role = data.role || 'OPERATOR';
  db.prepare(`
    INSERT INTO users (id, email, passwordHash, name, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.email.toLowerCase().trim(), data.passwordHash, data.name.trim(), role, now);

  return { id, email: data.email, name: data.name, role: role as any, createdAt: now };
}

export function updateUserPassword(id: string, newHash: string): void {
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, id);
}

// ----------------- DESTINATION REPOSITORY -----------------

function maskEncryptedKey(encryptedKey?: string): string {
  if (!encryptedKey) return '••••••••••••key';
  try {
    const plain = decryptSecret(encryptedKey);
    return maskSecret(plain) || '••••••••••••key';
  } catch {
    return '••••••••••••key';
  }
}

export function listDestinations(ownerId: string): Destination[] {
  const rows = db.prepare('SELECT * FROM destinations WHERE ownerId = ? ORDER BY createdAt DESC').all(ownerId) as any[];
  return rows.map(r => ({
    id: r.id,
    ownerId: r.ownerId,
    name: r.name,
    type: r.type,
    ingestUrl: r.ingestUrl,
    maskedStreamKey: maskEncryptedKey(r.encryptedStreamKey),
    isDefault: Boolean(r.isDefault),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));
}

export function getDestinationRaw(id: string, ownerId?: string): (Destination & { encryptedStreamKey: string }) | null {
  let query = 'SELECT * FROM destinations WHERE id = ?';
  const params: any[] = [id];
  if (ownerId) {
    query += ' AND ownerId = ?';
    params.push(ownerId);
  }
  const r = db.prepare(query).get(...params) as any;
  if (!r) return null;
  return {
    id: r.id,
    ownerId: r.ownerId,
    name: r.name,
    type: r.type,
    ingestUrl: r.ingestUrl,
    encryptedStreamKey: r.encryptedStreamKey,
    maskedStreamKey: maskEncryptedKey(r.encryptedStreamKey),
    isDefault: Boolean(r.isDefault),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

export function createDestination(data: { ownerId: string; name: string; type: string; ingestUrl: string; encryptedStreamKey: string; isDefault?: boolean }): Destination {
  const id = `dest_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  if (data.isDefault) {
    db.prepare('UPDATE destinations SET isDefault = 0 WHERE ownerId = ?').run(data.ownerId);
  }
  db.prepare(`
    INSERT INTO destinations (id, ownerId, name, type, ingestUrl, encryptedStreamKey, isDefault, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.ownerId, data.name, data.type, data.ingestUrl, data.encryptedStreamKey, data.isDefault ? 1 : 0, now, now);

  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    type: data.type as any,
    ingestUrl: data.ingestUrl,
    maskedStreamKey: maskEncryptedKey(data.encryptedStreamKey),
    isDefault: data.isDefault,
    createdAt: now,
    updatedAt: now
  };
}

export function updateDestination(id: string, ownerId: string, data: Partial<{ name: string; type: string; ingestUrl: string; encryptedStreamKey: string; isDefault: boolean }>): void {
  const now = new Date().toISOString();
  if (data.isDefault) {
    db.prepare('UPDATE destinations SET isDefault = 0 WHERE ownerId = ?').run(ownerId);
  }
  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [now];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.ingestUrl !== undefined) { fields.push('ingestUrl = ?'); values.push(data.ingestUrl); }
  if (data.encryptedStreamKey !== undefined) { fields.push('encryptedStreamKey = ?'); values.push(data.encryptedStreamKey); }
  if (data.isDefault !== undefined) { fields.push('isDefault = ?'); values.push(data.isDefault ? 1 : 0); }
  values.push(id, ownerId);
  db.prepare(`UPDATE destinations SET ${fields.join(', ')} WHERE id = ? AND ownerId = ?`).run(...values);
}

export function deleteDestination(id: string, ownerId: string): boolean {
  // Check if used by any stream
  const used = (db.prepare('SELECT COUNT(*) as c FROM streams WHERE destinationId = ?').get(id) as any).c;
  if (used > 0) return false;
  const res = db.prepare('DELETE FROM destinations WHERE id = ? AND ownerId = ?').run(id, ownerId);
  return res.changes > 0;
}

// ----------------- STREAM REPOSITORY -----------------

function formatStreamRow(r: any): Stream {
  return {
    id: r.id,
    ownerId: r.ownerId,
    name: r.name,
    description: r.description,
    sport: r.sport,
    eventId: r.eventId,
    sourceUrl: r.sourceUrl,
    sourceNotes: r.sourceNotes,
    destinationId: r.destinationId,
    outputProfile: r.outputProfileJson ? JSON.parse(r.outputProfileJson) : {},
    probeResult: r.probeResultJson ? JSON.parse(r.probeResultJson) : undefined,
    status: r.status as StreamStatus,
    currentJobId: r.currentJobId,
    tags: r.tagsJson ? JSON.parse(r.tagsJson) : [],
    thumbnailUrl: r.thumbnailUrl,
    internalNotes: r.internalNotes,
    isPublicWatchEnabled: Boolean(r.isPublicWatchEnabled),
    publicWatchSlug: r.publicWatchSlug,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function listStreams(ownerId?: string, statusFilter?: string): Stream[] {
  let query = `
    SELECT s.*, 
           d.name as destName, d.type as destType, d.ingestUrl as destIngest,
           e.title as eventTitle, e.competition as eventComp
    FROM streams s
    LEFT JOIN destinations d ON s.destinationId = d.id
    LEFT JOIN events e ON s.eventId = e.id
  `;
  const conditions: string[] = [];
  const params: any[] = [];
  if (ownerId) {
    conditions.push('s.ownerId = ?');
    params.push(ownerId);
  }
  if (statusFilter && statusFilter !== 'ALL') {
    conditions.push('s.status = ?');
    params.push(statusFilter);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY s.updatedAt DESC';

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => {
    const s = formatStreamRow(r);
    if (r.destName) {
      s.destination = {
        id: r.destinationId,
        ownerId: r.ownerId,
        name: r.destName,
        type: r.destType,
        ingestUrl: r.destIngest,
        maskedStreamKey: '••••••••',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }
    return s;
  });
}

export function getStreamById(id: string, ownerId?: string): Stream | null {
  let query = 'SELECT * FROM streams WHERE id = ?';
  const params: any[] = [id];
  if (ownerId) {
    query += ' AND ownerId = ?';
    params.push(ownerId);
  }
  const r = db.prepare(query).get(...params) as any;
  if (!r) return null;
  const s = formatStreamRow(r);

  // Attach destination if exists
  if (s.destinationId) {
    const d = db.prepare('SELECT id, ownerId, name, type, ingestUrl, encryptedStreamKey, createdAt, updatedAt FROM destinations WHERE id = ?').get(s.destinationId) as any;
    if (d) {
      s.destination = {
        id: d.id,
        ownerId: d.ownerId,
        name: d.name,
        type: d.type,
        ingestUrl: d.ingestUrl,
        maskedStreamKey: maskEncryptedKey(d.encryptedStreamKey),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      };
    }
  }

  // Attach event if linked
  if (s.eventId) {
    const e = db.prepare('SELECT * FROM events WHERE id = ?').get(s.eventId) as any;
    if (e) {
      s.event = {
        id: e.id,
        ownerId: e.ownerId,
        title: e.title,
        sport: e.sport,
        competition: e.competition,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        venue: e.venue,
        startTime: e.startTime,
        timezone: e.timezone,
        status: e.status,
        thumbnailUrl: e.thumbnailUrl,
        broadcastNotes: e.broadcastNotes,
        publicWatchEnabled: Boolean(e.publicWatchEnabled),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      };
    }
  }

  // Attach current job if exists
  if (s.currentJobId) {
    const j = db.prepare('SELECT * FROM streaming_jobs WHERE id = ?').get(s.currentJobId) as any;
    if (j) {
      s.currentJob = j as StreamingJob;
    }
  }

  return s;
}

export function createStream(data: Partial<Stream> & { ownerId: string; name: string; sourceUrl: string; destinationId: string }): Stream {
  const id = `strm_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO streams (
      id, ownerId, name, description, sport, eventId, sourceUrl, sourceNotes,
      destinationId, outputProfileJson, probeResultJson, status, tagsJson,
      thumbnailUrl, internalNotes, isPublicWatchEnabled, publicWatchSlug,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.ownerId,
    data.name,
    data.description || null,
    data.sport || 'FOOTBALL',
    data.eventId || null,
    data.sourceUrl,
    data.sourceNotes || null,
    data.destinationId,
    JSON.stringify(data.outputProfile || { mode: 'COPY' }),
    data.probeResult ? JSON.stringify(data.probeResult) : null,
    JSON.stringify(data.tags || []),
    data.thumbnailUrl || null,
    data.internalNotes || null,
    data.isPublicWatchEnabled ? 1 : 0,
    data.publicWatchSlug || null,
    now,
    now
  );

  return getStreamById(id)!;
}

export function updateStream(id: string, data: Partial<Stream>): void {
  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [new Date().toISOString()];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.sport !== undefined) { fields.push('sport = ?'); values.push(data.sport); }
  if (data.eventId !== undefined) { fields.push('eventId = ?'); values.push(data.eventId); }
  if (data.sourceUrl !== undefined) { fields.push('sourceUrl = ?'); values.push(data.sourceUrl); }
  if (data.sourceNotes !== undefined) { fields.push('sourceNotes = ?'); values.push(data.sourceNotes); }
  if (data.destinationId !== undefined) { fields.push('destinationId = ?'); values.push(data.destinationId); }
  if (data.outputProfile !== undefined) { fields.push('outputProfileJson = ?'); values.push(JSON.stringify(data.outputProfile)); }
  if (data.probeResult !== undefined) { fields.push('probeResultJson = ?'); values.push(JSON.stringify(data.probeResult)); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.currentJobId !== undefined) { fields.push('currentJobId = ?'); values.push(data.currentJobId); }
  if (data.tags !== undefined) { fields.push('tagsJson = ?'); values.push(JSON.stringify(data.tags)); }
  if (data.thumbnailUrl !== undefined) { fields.push('thumbnailUrl = ?'); values.push(data.thumbnailUrl); }
  if (data.internalNotes !== undefined) { fields.push('internalNotes = ?'); values.push(data.internalNotes); }
  if (data.isPublicWatchEnabled !== undefined) { fields.push('isPublicWatchEnabled = ?'); values.push(data.isPublicWatchEnabled ? 1 : 0); }
  if (data.publicWatchSlug !== undefined) { fields.push('publicWatchSlug = ?'); values.push(data.publicWatchSlug); }

  values.push(id);
  db.prepare(`UPDATE streams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateStreamStatus(id: string, status: StreamStatus, currentJobId?: string | null): void {
  const now = new Date().toISOString();
  if (currentJobId !== undefined) {
    db.prepare('UPDATE streams SET status = ?, currentJobId = ?, updatedAt = ? WHERE id = ?').run(status, currentJobId, now, id);
  } else {
    db.prepare('UPDATE streams SET status = ?, updatedAt = ? WHERE id = ?').run(status, now, id);
  }
}

export function deleteStream(id: string, ownerId: string): boolean {
  const res = db.prepare('DELETE FROM streams WHERE id = ? AND ownerId = ?').run(id, ownerId);
  return res.changes > 0;
}

// ----------------- STREAMING JOBS REPOSITORY -----------------

export function createStreamingJob(data: { streamId: string; scheduleId?: string | null; workerId: string; scheduledStopAt?: string | null }): StreamingJob {
  const id = `job_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO streaming_jobs (
      id, streamId, scheduleId, workerId, state, startedAt, scheduledStopAt,
      reconnectCount, totalBytesSent, currentFps, currentBitrateKbps, currentDropFrames,
      currentUptimeSeconds, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)
  `).run(id, data.streamId, data.scheduleId || null, data.workerId, now, data.scheduledStopAt || null, now, now);

  return db.prepare('SELECT * FROM streaming_jobs WHERE id = ?').get(id) as any;
}

export function updateStreamingJob(id: string, data: Partial<StreamingJob>): void {
  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [new Date().toISOString()];

  if (data.state !== undefined) { fields.push('state = ?'); values.push(data.state); }
  if (data.startedAt !== undefined) { fields.push('startedAt = ?'); values.push(data.startedAt); }
  if (data.stoppedAt !== undefined) { fields.push('stoppedAt = ?'); values.push(data.stoppedAt); }
  if (data.exitCode !== undefined) { fields.push('exitCode = ?'); values.push(data.exitCode); }
  if (data.errorSummary !== undefined) { fields.push('errorSummary = ?'); values.push(data.errorSummary); }
  if (data.reconnectCount !== undefined) { fields.push('reconnectCount = ?'); values.push(data.reconnectCount); }
  if (data.totalBytesSent !== undefined) { fields.push('totalBytesSent = ?'); values.push(data.totalBytesSent); }
  if (data.currentFps !== undefined) { fields.push('currentFps = ?'); values.push(data.currentFps); }
  if (data.currentBitrateKbps !== undefined) { fields.push('currentBitrateKbps = ?'); values.push(data.currentBitrateKbps); }
  if (data.currentDropFrames !== undefined) { fields.push('currentDropFrames = ?'); values.push(data.currentDropFrames); }
  if (data.currentUptimeSeconds !== undefined) { fields.push('currentUptimeSeconds = ?'); values.push(data.currentUptimeSeconds); }

  values.push(id);
  db.prepare(`UPDATE streaming_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getJobById(id: string): StreamingJob | null {
  return (db.prepare('SELECT * FROM streaming_jobs WHERE id = ?').get(id) as any) || null;
}

export function getRunningJobs(): StreamingJob[] {
  return db.prepare("SELECT * FROM streaming_jobs WHERE state IN ('RUNNING', 'RECONNECTING', 'QUEUED')").all() as any[];
}

// ----------------- SCHEDULES REPOSITORY -----------------

export function listSchedules(ownerId?: string): Schedule[] {
  let query = `
    SELECT s.*, st.name as streamName, st.sport as streamSport
    FROM schedules s
    JOIN streams st ON s.streamId = st.id
  `;
  const params: any[] = [];
  if (ownerId) {
    query += ' WHERE st.ownerId = ?';
    params.push(ownerId);
  }
  query += ' ORDER BY s.startTime ASC';
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    streamId: r.streamId,
    startTime: r.startTime,
    stopTime: r.stopTime,
    timezone: r.timezone,
    recurrence: r.recurrence,
    selectedDays: r.selectedDaysJson ? JSON.parse(r.selectedDaysJson) : [],
    enabled: Boolean(r.enabled),
    lastExecution: r.lastExecution,
    nextExecution: r.nextExecution,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    stream: {
      name: r.streamName,
      sport: r.streamSport
    } as any
  }));
}

export function createSchedule(data: { streamId: string; startTime: string; stopTime?: string | null; timezone: string; recurrence: string; selectedDays?: number[]; enabled?: boolean }): Schedule {
  const id = `sched_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO schedules (id, streamId, startTime, stopTime, timezone, recurrence, selectedDaysJson, enabled, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.streamId,
    data.startTime,
    data.stopTime || null,
    data.timezone,
    data.recurrence,
    data.selectedDays ? JSON.stringify(data.selectedDays) : null,
    data.enabled !== false ? 1 : 0,
    now,
    now
  );
  return db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
}

export function updateSchedule(id: string, data: Partial<Schedule>): void {
  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [new Date().toISOString()];

  if (data.startTime !== undefined) { fields.push('startTime = ?'); values.push(data.startTime); }
  if (data.stopTime !== undefined) { fields.push('stopTime = ?'); values.push(data.stopTime); }
  if (data.timezone !== undefined) { fields.push('timezone = ?'); values.push(data.timezone); }
  if (data.recurrence !== undefined) { fields.push('recurrence = ?'); values.push(data.recurrence); }
  if (data.selectedDays !== undefined) { fields.push('selectedDaysJson = ?'); values.push(JSON.stringify(data.selectedDays)); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.lastExecution !== undefined) { fields.push('lastExecution = ?'); values.push(data.lastExecution); }
  if (data.nextExecution !== undefined) { fields.push('nextExecution = ?'); values.push(data.nextExecution); }

  values.push(id);
  db.prepare(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteSchedule(id: string): boolean {
  const res = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  return res.changes > 0;
}

export function getPendingDueSchedules(): Schedule[] {
  const now = new Date().toISOString();
  // Enabled schedules whose start time is reached or passed within the last hour and haven't run recently
  const rows = db.prepare(`
    SELECT * FROM schedules 
    WHERE enabled = 1 
      AND startTime <= ?
      AND (lastExecution IS NULL OR lastExecution < startTime)
  `).all(now) as any[];

  return rows.map(r => ({
    ...r,
    enabled: Boolean(r.enabled),
    selectedDays: r.selectedDaysJson ? JSON.parse(r.selectedDaysJson) : []
  }));
}

// ----------------- SPORTS EVENTS REPOSITORY -----------------

export function listEvents(ownerId?: string, search?: string): SportsEvent[] {
  let query = 'SELECT * FROM events';
  const conditions: string[] = [];
  const params: any[] = [];
  if (ownerId) {
    conditions.push('ownerId = ?');
    params.push(ownerId);
  }
  if (search) {
    conditions.push('(title LIKE ? OR homeTeam LIKE ? OR awayTeam LIKE ? OR competition LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY startTime ASC';
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    ...r,
    publicWatchEnabled: Boolean(r.publicWatchEnabled)
  }));
}

export function getEventById(id: string): SportsEvent | null {
  const r = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!r) return null;
  const evt: SportsEvent = {
    ...r,
    publicWatchEnabled: Boolean(r.publicWatchEnabled)
  };
  // Attach linked streams
  const streams = db.prepare('SELECT * FROM streams WHERE eventId = ?').all(id) as any[];
  evt.streams = streams.map(formatStreamRow);
  return evt;
}

export function createEvent(data: Partial<SportsEvent> & { ownerId: string; title: string; sport: string; competition: string; homeTeam: string; awayTeam: string; startTime: string }): SportsEvent {
  const id = `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (
      id, ownerId, title, sport, competition, homeTeam, awayTeam, venue,
      startTime, timezone, status, thumbnailUrl, broadcastNotes, publicWatchEnabled,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.ownerId,
    data.title,
    data.sport,
    data.competition,
    data.homeTeam,
    data.awayTeam,
    data.venue || null,
    data.startTime,
    data.timezone || 'UTC',
    data.status || 'UPCOMING',
    data.thumbnailUrl || null,
    data.broadcastNotes || null,
    data.publicWatchEnabled !== false ? 1 : 0,
    now,
    now
  );
  return getEventById(id)!;
}

export function updateEvent(id: string, ownerId: string, data: Partial<SportsEvent>): void {
  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [new Date().toISOString()];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.sport !== undefined) { fields.push('sport = ?'); values.push(data.sport); }
  if (data.competition !== undefined) { fields.push('competition = ?'); values.push(data.competition); }
  if (data.homeTeam !== undefined) { fields.push('homeTeam = ?'); values.push(data.homeTeam); }
  if (data.awayTeam !== undefined) { fields.push('awayTeam = ?'); values.push(data.awayTeam); }
  if (data.venue !== undefined) { fields.push('venue = ?'); values.push(data.venue); }
  if (data.startTime !== undefined) { fields.push('startTime = ?'); values.push(data.startTime); }
  if (data.timezone !== undefined) { fields.push('timezone = ?'); values.push(data.timezone); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.thumbnailUrl !== undefined) { fields.push('thumbnailUrl = ?'); values.push(data.thumbnailUrl); }
  if (data.broadcastNotes !== undefined) { fields.push('broadcastNotes = ?'); values.push(data.broadcastNotes); }
  if (data.publicWatchEnabled !== undefined) { fields.push('publicWatchEnabled = ?'); values.push(data.publicWatchEnabled ? 1 : 0); }

  values.push(id, ownerId);
  db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ? AND ownerId = ?`).run(...values);
}

export function deleteEvent(id: string, ownerId: string): boolean {
  const res = db.prepare('DELETE FROM events WHERE id = ? AND ownerId = ?').run(id, ownerId);
  return res.changes > 0;
}

// ----------------- STREAM LOGS & AUDIT LOGS -----------------

export function addStreamLog(log: Omit<StreamLog, 'id' | 'timestamp'> & { timestamp?: string }): void {
  const id = `log_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const ts = log.timestamp || new Date().toISOString();
  db.prepare(`
    INSERT INTO stream_logs (id, streamId, jobId, severity, eventType, message, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, log.streamId, log.jobId || null, log.severity, log.eventType, log.message, ts);
}

export function getStreamLogs(streamId: string, limit: number = 100): StreamLog[] {
  return db.prepare(`
    SELECT * FROM stream_logs 
    WHERE streamId = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `).all(streamId, limit) as any[];
}

export function getAllLogs(limit: number = 200, severity?: string): StreamLog[] {
  let query = 'SELECT * FROM stream_logs';
  const params: any[] = [];
  if (severity && severity !== 'ALL') {
    query += ' WHERE severity = ?';
    params.push(severity);
  }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  return db.prepare(query).all(...params) as any[];
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const id = `audit_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const ts = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, userId, action, resourceType, resourceId, sanitizedMetadataJson, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    log.userId, 
    log.action, 
    log.resourceType, 
    log.resourceId, 
    log.sanitizedMetadata ? JSON.stringify(log.sanitizedMetadata) : null, 
    ts
  );
}

export function getAuditLogs(userId?: string, limit: number = 50): AuditLog[] {
  let query = `
    SELECT a.*, u.email as userEmail 
    FROM audit_logs a 
    JOIN users u ON a.userId = u.id
  `;
  const params: any[] = [];
  if (userId) {
    query += ' WHERE a.userId = ?';
    params.push(userId);
  }
  query += ' ORDER BY a.timestamp DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    ...r,
    sanitizedMetadata: r.sanitizedMetadataJson ? JSON.parse(r.sanitizedMetadataJson) : undefined
  }));
}

// ----------------- ANALYTICS STATS -----------------

export function getAnalyticsSummary(ownerId?: string) {
  const streamStats = db.prepare(`
    SELECT 
      COUNT(*) as totalStreams,
      SUM(CASE WHEN status = 'LIVE' THEN 1 ELSE 0 END) as liveStreams,
      SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as readyStreams,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failedStreams
    FROM streams
  `).get() as any;

  const jobStats = db.prepare(`
    SELECT 
      COUNT(*) as totalJobs,
      SUM(CASE WHEN state = 'COMPLETED' THEN 1 ELSE 0 END) as successfulJobs,
      SUM(CASE WHEN state = 'FAILED' THEN 1 ELSE 0 END) as failedJobs,
      SUM(reconnectCount) as totalReconnections,
      SUM(currentUptimeSeconds) as totalBroadcastSeconds
    FROM streaming_jobs
  `).get() as any;

  const eventCount = (db.prepare('SELECT COUNT(*) as c FROM events').get() as any).c;
  const destCount = (db.prepare('SELECT COUNT(*) as c FROM destinations').get() as any).c;
  const upcomingSchedulesCount = (db.prepare("SELECT COUNT(*) as c FROM schedules WHERE enabled = 1 AND startTime >= datetime('now')").get() as any).c;

  return {
    streams: streamStats,
    jobs: jobStats,
    eventsCount: eventCount,
    destinationsCount: destCount,
    upcomingSchedulesCount: upcomingSchedulesCount
  };
}

// Initialize tables on startup
initDatabase();
