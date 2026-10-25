import { z } from 'zod';

export const SportCategoryEnum = z.enum([
  'FOOTBALL',
  'BASKETBALL',
  'TENNIS',
  'BASEBALL',
  'CRICKET',
  'MOTORSPORTS',
  'ESPORTS',
  'COMBAT',
  'RUGBY',
  'OTHER'
]);

export const DestinationTypeEnum = z.enum([
  'YOUTUBE',
  'CUSTOM_RTMP',
  'CUSTOM_RTMPS'
]);

export const RecurrenceTypeEnum = z.enum([
  'ONCE',
  'DAILY',
  'WEEKDAYS',
  'WEEKLY'
]);

export const OutputProfileSchema = z.object({
  mode: z.enum(['COPY', 'TRANSCODE']).default('COPY'),
  resolution: z.enum(['source', '1080p', '720p', '480p']).default('source'),
  videoBitrate: z.number().min(500).max(20000).default(4500),
  audioBitrate: z.number().min(64).max(320).default(128),
  fps: z.number().min(15).max(60).default(60),
  videoCodec: z.enum(['copy', 'libx264']).default('copy'),
  audioCodec: z.enum(['copy', 'aac']).default('copy'),
  keyframeIntervalSeconds: z.number().min(1).max(10).default(2),
  preset: z.enum(['veryfast', 'faster', 'fast', 'medium']).default('veryfast'),
});

// Stream creation & edit validation
export const CreateStreamSchema = z.object({
  name: z.string().min(2, 'Stream name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  sport: SportCategoryEnum.default('FOOTBALL'),
  eventId: z.string().optional().nullable(),
  sourceUrl: z.string().url('Must be a valid URL (HTTP or HTTPS)'),
  sourceNotes: z.string().max(500).optional(),
  destinationId: z.string().min(1, 'Destination is required'),
  outputProfile: OutputProfileSchema.default({}),
  tags: z.array(z.string()).default([]),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  internalNotes: z.string().max(2000).optional(),
  isPublicWatchEnabled: z.boolean().default(false),
  publicWatchSlug: z.string().regex(/^[a-z0-9-_]*$/, 'Slug must be alphanumeric with dashes').optional(),
});

export const UpdateStreamSchema = CreateStreamSchema.partial();

// Validate source URL endpoint
export const ValidateSourceSchema = z.object({
  sourceUrl: z.string().url('A valid HTTP/HTTPS URL is required'),
  authHeader: z.string().optional(),
});

// Destination validation
export const CreateDestinationSchema = z.object({
  name: z.string().min(2, 'Destination name must be at least 2 characters').max(80),
  type: DestinationTypeEnum,
  ingestUrl: z.string().min(5, 'Ingest URL is required'),
  streamKey: z.string().min(1, 'Stream key is required'),
  isDefault: z.boolean().default(false),
});

export const UpdateDestinationSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  type: DestinationTypeEnum.optional(),
  ingestUrl: z.string().min(5).optional(),
  streamKey: z.string().min(1).optional(), // optional on update
  isDefault: z.boolean().optional(),
});

// Schedule validation
export const BaseScheduleSchema = z.object({
  streamId: z.string().min(1, 'Stream is required'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 string' }),
  stopTime: z.string().datetime({ message: 'Stop time must be a valid ISO 8601 string' }).optional().nullable(),
  timezone: z.string().min(2, 'Timezone is required (e.g. UTC, America/New_York, Europe/London)'),
  recurrence: RecurrenceTypeEnum.default('ONCE'),
  selectedDays: z.array(z.number().min(0).max(6)).optional(),
  enabled: z.boolean().default(true),
});

export const CreateScheduleSchema = BaseScheduleSchema.refine(data => {
  if (data.stopTime) {
    return new Date(data.stopTime) > new Date(data.startTime);
  }
  return true;
}, {
  message: 'Stop time must be strictly after Start time',
  path: ['stopTime'],
});

export const UpdateScheduleSchema = BaseScheduleSchema.partial();

// Sports Event validation
export const CreateEventSchema = z.object({
  title: z.string().min(2, 'Event title is required').max(120),
  sport: SportCategoryEnum.default('FOOTBALL'),
  competition: z.string().min(2, 'Competition or league is required').max(100),
  homeTeam: z.string().min(2, 'Home team is required').max(80),
  awayTeam: z.string().min(2, 'Away team is required').max(80),
  venue: z.string().max(120).optional(),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 string' }),
  timezone: z.string().min(2).default('UTC'),
  status: z.enum(['UPCOMING', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED']).default('UPCOMING'),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  broadcastNotes: z.string().max(1000).optional(),
  publicWatchEnabled: z.boolean().default(true),
});

export const UpdateEventSchema = CreateEventSchema.partial();

// Auth schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
