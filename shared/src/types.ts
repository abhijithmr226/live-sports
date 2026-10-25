export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export type StreamStatus = 
  | 'IDLE' 
  | 'PROBING' 
  | 'READY' 
  | 'STARTING' 
  | 'LIVE' 
  | 'RECONNECTING' 
  | 'STOPPING' 
  | 'STOPPED' 
  | 'FAILED';

export type DestinationType = 'YOUTUBE' | 'CUSTOM_RTMP' | 'CUSTOM_RTMPS';

export type SportCategory = 
  | 'FOOTBALL' 
  | 'BASKETBALL' 
  | 'TENNIS' 
  | 'BASEBALL' 
  | 'CRICKET' 
  | 'MOTORSPORTS' 
  | 'ESPORTS' 
  | 'COMBAT' 
  | 'RUGBY' 
  | 'OTHER';

export type TranscodeMode = 'COPY' | 'TRANSCODE';

export interface OutputProfile {
  mode: TranscodeMode;
  resolution?: 'source' | '1080p' | '720p' | '480p';
  videoBitrate?: number; // in kbps e.g. 4500
  audioBitrate?: number; // in kbps e.g. 128
  fps?: number; // e.g. 30, 60
  videoCodec?: 'copy' | 'libx264';
  audioCodec?: 'copy' | 'aac';
  keyframeIntervalSeconds?: number;
  preset?: 'veryfast' | 'faster' | 'fast' | 'medium';
  audioVolumeBoostDb?: number; // Audio volume gain in dB (+0 to +20dB)
  audioNormalize?: boolean; // Loudness normalization (EBU R128)
  autoTranscodeCompatibility?: boolean; // Auto-transcode non-H264 video for YouTube FLV
}

export interface StreamSourceConfig {
  url: string;
  authHeader?: string;
  notes?: string;
}

export interface StreamProbeResult {
  valid: boolean;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitrateKbps?: number;
  audioChannels?: number;
  sampleRate?: number;
  error?: string;
  probedAt?: string;
}

export interface Stream {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  sport: SportCategory;
  eventId?: string | null;
  sourceUrl: string; // Stored securely/redacted in public APIs
  sourceNotes?: string;
  destinationId: string;
  outputProfile: OutputProfile;
  probeResult?: StreamProbeResult;
  status: StreamStatus;
  currentJobId?: string | null;
  tags?: string[];
  thumbnailUrl?: string;
  internalNotes?: string;
  isPublicWatchEnabled: boolean;
  publicWatchSlug?: string;
  createdAt: string;
  updatedAt: string;
  destination?: Destination;
  event?: SportsEvent;
  currentJob?: StreamingJob;
}

export interface Destination {
  id: string;
  ownerId: string;
  name: string;
  type: DestinationType;
  ingestUrl: string;
  maskedStreamKey: string; // e.g. "••••••••" + last 4 chars
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurrenceType = 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY';

export interface Schedule {
  id: string;
  streamId: string;
  startTime: string; // ISO 8601
  stopTime?: string | null; // ISO 8601
  timezone: string;
  recurrence: RecurrenceType;
  selectedDays?: number[]; // 0=Sunday .. 6=Saturday
  enabled: boolean;
  lastExecution?: string | null;
  nextExecution?: string | null;
  createdAt: string;
  updatedAt: string;
  stream?: Stream;
}

export type JobState = 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'RECONNECTING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'TERMINATED';

export interface StreamingJob {
  id: string;
  streamId: string;
  scheduleId?: string | null;
  workerId: string;
  state: JobState;
  startedAt?: string | null;
  stoppedAt?: string | null;
  scheduledStopAt?: string | null;
  exitCode?: number | null;
  errorSummary?: string | null;
  reconnectCount: number;
  totalBytesSent?: number;
  currentFps?: number;
  currentBitrateKbps?: number;
  currentDropFrames?: number;
  currentUptimeSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'UPCOMING' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface SportsEvent {
  id: string;
  ownerId: string;
  title: string;
  sport: SportCategory;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  startTime: string; // ISO 8601
  timezone: string;
  status: EventStatus;
  thumbnailUrl?: string;
  broadcastNotes?: string;
  publicWatchEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  streams?: Stream[];
}

export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface StreamLog {
  id: string;
  streamId: string;
  jobId?: string | null;
  severity: LogSeverity;
  eventType: 
    | 'JOB_CREATED'
    | 'JOB_SCHEDULED'
    | 'JOB_STARTED'
    | 'INPUT_CONNECTED'
    | 'OUTPUT_CONNECTED'
    | 'INPUT_LOST'
    | 'OUTPUT_LOST'
    | 'RECONNECT_ATTEMPT'
    | 'FFMPEG_EXIT'
    | 'JOB_STOPPED'
    | 'JOB_FAILED'
    | 'RECOVERED_AFTER_RESTART';
  message: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'STREAM_START' | 'STREAM_STOP' | 'STREAM_RESTART' | 'DESTINATION_UPDATE' | 'SCHEDULE_CHANGE' | 'EVENT_MODIFIED' | 'AUTH_EVENT';
  resourceType: 'STREAM' | 'DESTINATION' | 'SCHEDULE' | 'EVENT' | 'USER';
  resourceId: string;
  sanitizedMetadata?: Record<string, unknown>;
  timestamp: string;
  userEmail?: string;
}

export interface StreamTelemetryUpdate {
  streamId: string;
  jobId: string;
  status: StreamStatus;
  state: JobState;
  fps: number;
  bitrateKbps: number;
  dropFrames: number;
  speed: string;
  uptimeSeconds: number;
  timestamp: string;
  cpuPercent?: number;
  memoryMb?: number;
}

export interface WorkerHealth {
  workerId: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  activeJobsCount: number;
  maxJobsCapacity: number;
  ffmpegVersion?: string;
  uptimeSeconds: number;
  system: {
    platform: string;
    cpus: number;
    freeMemoryMb: number;
    totalMemoryMb: number;
    cpuLoadPercent: number;
  };
  lastHeartbeat: string;
}

export interface PublicWatchData {
  id: string;
  title: string;
  sport: SportCategory;
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
  status: EventStatus | StreamStatus;
  startTime?: string;
  thumbnailUrl?: string;
  description?: string;
  destinationType?: DestinationType;
  embedType: 'YOUTUBE' | 'HLS' | 'NONE';
  youtubeVideoId?: string;
  publicHlsUrl?: string;
}
