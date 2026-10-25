import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import os from 'os';
import { CONFIG } from '../config';
import { 
  getStreamById, 
  updateStreamStatus, 
  getDestinationRaw, 
  createStreamingJob, 
  updateStreamingJob, 
  addStreamLog, 
  addAuditLog, 
  getRunningJobs,
  getJobById
} from '../db';
import { decryptSecret } from '../security/encryption';
import { redactSecrets } from '../security/redact';
import { Stream, StreamingJob, StreamTelemetryUpdate, WorkerHealth } from '@cloudcast/shared';

export interface RunningProcessInfo {
  jobId: string;
  streamId: string;
  child: ChildProcess;
  startedAt: number;
  scheduledStopTimer?: NodeJS.Timeout;
  watchdogTimer?: NodeJS.Timeout;
  stableTimer?: NodeJS.Timeout;
  reconnectAttempts: number;
  isIntentionalStop: boolean;
  lastFps: number;
  lastBitrateKbps: number;
  lastDropFrames: number;
  uptimeSeconds: number;
  lastProgressAt: number;
}

class StreamingEngine extends EventEmitter {
  private activeProcesses = new Map<string, RunningProcessInfo>(); // key: streamId
  private reconnectTimers = new Map<string, NodeJS.Timeout>(); // key: streamId
  private startTime = Date.now();

  constructor() {
    super();
    // Maximum listeners for telemetry SSE subscribers
    this.setMaxListeners(200);
  }

  /**
   * Reconcile jobs after system/worker restart.
   */
  public async reconcileJobsOnStartup(): Promise<void> {
    const runningJobs = getRunningJobs();
    for (const job of runningJobs) {
      addStreamLog({
        streamId: job.streamId,
        jobId: job.id,
        severity: 'WARN',
        eventType: 'RECOVERED_AFTER_RESTART',
        message: `Worker restarted. Previous active job [${job.id}] was interrupted.`
      });

      updateStreamingJob(job.id, {
        state: 'TERMINATED',
        stoppedAt: new Date().toISOString(),
        errorSummary: 'Worker process restarted while job was active'
      });

      updateStreamStatus(job.streamId, 'STOPPED', null);
    }
  }

  public getActiveJobsCount(): number {
    return this.activeProcesses.size;
  }

  public getWorkerHealth(): WorkerHealth {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    const cpuLoad = Math.min(100, Math.round((loadAvg[0] / (cpus.length || 1)) * 100));

    return {
      workerId: CONFIG.WORKER_ID,
      status: this.activeProcesses.size >= CONFIG.MAX_CONCURRENT_JOBS ? 'DEGRADED' : 'ONLINE',
      activeJobsCount: this.activeProcesses.size,
      maxJobsCapacity: CONFIG.MAX_CONCURRENT_JOBS,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      system: {
        platform: `${os.platform()} (${os.arch()})`,
        cpus: cpus.length,
        freeMemoryMb: freeMem,
        totalMemoryMb: totalMem,
        cpuLoadPercent: isNaN(cpuLoad) ? 12 : cpuLoad
      },
      lastHeartbeat: new Date().toISOString()
    };
  }

  /**
   * Starts a stream relay job using safe argument arrays and real FFmpeg.
   */
  public async startStream(streamId: string, userId: string, scheduledStopAt?: string | null, scheduleId?: string | null): Promise<StreamingJob> {
    // Clear any existing reconnect timer
    const existingRetry = this.reconnectTimers.get(streamId);
    if (existingRetry) {
      clearTimeout(existingRetry);
      this.reconnectTimers.delete(streamId);
    }

    // Check if already active
    if (this.activeProcesses.has(streamId)) {
      throw new Error(`Stream [${streamId}] is already running an active broadcast job`);
    }

    if (this.activeProcesses.size >= CONFIG.MAX_CONCURRENT_JOBS) {
      throw new Error(`Worker capacity reached (Max: ${CONFIG.MAX_CONCURRENT_JOBS} concurrent broadcasts). Please wait for an existing stream to finish.`);
    }

    const stream = getStreamById(streamId);
    if (!stream) {
      throw new Error(`Stream [${streamId}] not found`);
    }

    const destination = getDestinationRaw(stream.destinationId);
    if (!destination) {
      throw new Error(`Destination for stream [${streamId}] not found`);
    }

    // Decrypt stream key securely in memory
    const streamKey = decryptSecret(destination.encryptedStreamKey);
    if (!streamKey) {
      throw new Error('Destination stream key is empty or invalid');
    }

    // Construct RTMP ingest destination URL
    // e.g. rtmp://a.rtmp.youtube.com/live2/abcd-1234
    let targetRtmpUrl = destination.ingestUrl.trim();
    if (!targetRtmpUrl.endsWith('/')) {
      targetRtmpUrl += '/';
    }
    targetRtmpUrl += streamKey.trim();

    // Create durable job in DB
    const job = createStreamingJob({
      streamId: stream.id,
      scheduleId: scheduleId || null,
      workerId: CONFIG.WORKER_ID,
      scheduledStopAt: scheduledStopAt || null
    });

    updateStreamStatus(stream.id, 'STARTING', job.id);

    addStreamLog({
      streamId: stream.id,
      jobId: job.id,
      severity: 'INFO',
      eventType: 'JOB_CREATED',
      message: `Created streaming broadcast job [${job.id}]. Target destination: ${destination.name} (${destination.type})`
    });

    addAuditLog({
      userId,
      action: 'STREAM_START',
      resourceType: 'STREAM',
      resourceId: stream.id,
      sanitizedMetadata: {
        jobId: job.id,
        destinationType: destination.type,
        destinationName: destination.name,
        scheduledStopAt
      }
    });

    this.spawnFfmpegProcess(stream, job, targetRtmpUrl, scheduledStopAt, 0);
    return job;
  }

  private spawnFfmpegProcess(
    stream: Stream, 
    job: StreamingJob, 
    targetRtmpUrl: string, 
    scheduledStopAt?: string | null,
    initialReconnectAttempts: number = 0
  ) {
    const profile = stream.outputProfile || { mode: 'COPY' };
    const isTranscode = profile.mode === 'TRANSCODE';

    // Safe FFmpeg arguments with heavy-duty network resiliency:
    // -reconnect 1: reconnect on failure
    // -reconnect_at_eof 1: reconnect if source hits premature EOF/segment gap
    // -reconnect_streamed 1: reconnect streamed playlists
    // -reconnect_delay_max 5: maximum reconnect backoff delay in seconds for HTTP/HLS
    // -rw_timeout 15000000: 15-second socket timeout (prevents silent frozen TCP stalls)
    // -fflags +genpts+discardcorrupt: regenerate timestamps and gracefully ignore corrupt packets
    const args: string[] = [
      '-reconnect', '1',
      '-reconnect_at_eof', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-rw_timeout', '15000000',
      '-err_detect', 'ignore_err',
      '-fflags', '+genpts+discardcorrupt',
      '-i', stream.sourceUrl
    ];

    if (isTranscode) {
      args.push(
        '-c:v', profile.videoCodec === 'libx264' ? 'libx264' : 'libx264',
        '-preset', profile.preset || 'veryfast',
        '-b:v', `${profile.videoBitrate || 4500}k`,
        '-maxrate', `${profile.videoBitrate || 4500}k`,
        '-bufsize', `${(profile.videoBitrate || 4500) * 2}k`,
        '-pix_fmt', 'yuv420p',
        '-g', `${(profile.fps || 60) * (profile.keyframeIntervalSeconds || 2)}`,
        '-c:a', 'aac',
        '-b:a', `${profile.audioBitrate || 128}k`,
        '-ar', '44100'
      );

      if (profile.fps) {
        args.push('-r', `${profile.fps}`);
      }
    } else {
      // Copy compatible streams directly without re-encoding CPU overhead
      args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k');
    }

    // Output container format for RTMP / YouTube Live with resilient flags
    args.push(
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv', 
      targetRtmpUrl
    );

    addStreamLog({
      streamId: stream.id,
      jobId: job.id,
      severity: 'INFO',
      eventType: 'JOB_STARTED',
      message: `Starting FFmpeg relay (Mode: ${profile.mode}, Video: ${isTranscode ? 'Transcode' : 'Stream-Copy'}, Destination: RTMP FLV, Resiliency: Infinite Auto-Reconnect & Watchdog)`
    });

    // Spawn FFmpeg directly without a shell
    const child = spawn(CONFIG.FFMPEG_PATH, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const procInfo: RunningProcessInfo = {
      jobId: job.id,
      streamId: stream.id,
      child,
      startedAt: Date.now(),
      reconnectAttempts: initialReconnectAttempts,
      isIntentionalStop: false,
      lastFps: 0,
      lastBitrateKbps: 0,
      lastDropFrames: 0,
      uptimeSeconds: 0,
      lastProgressAt: Date.now()
    };

    // If stream runs stably for 30 seconds without termination, reset the reconnect backoff counter
    procInfo.stableTimer = setTimeout(() => {
      if (this.activeProcesses.get(stream.id) === procInfo && !procInfo.isIntentionalStop) {
        procInfo.reconnectAttempts = 0;
      }
    }, 30000);

    // Watchdog check every 10 seconds: If FFmpeg stalls with no stderr data for 30 seconds, force restart
    procInfo.watchdogTimer = setInterval(() => {
      if (procInfo.isIntentionalStop) return;
      const idleSec = Math.round((Date.now() - procInfo.lastProgressAt) / 1000);
      if (idleSec >= 30) {
        addStreamLog({
          streamId: stream.id,
          jobId: job.id,
          severity: 'WARN',
          eventType: 'RECONNECT_ATTEMPT',
          message: `Watchdog alert: Stream pipeline stalled (no packets for ${idleSec}s). Force-restarting relay...`
        });
        try {
          procInfo.child.kill('SIGKILL');
        } catch {
          procInfo.child.kill();
        }
      }
    }, 10000);

    // If scheduled stop time was provided, setup stop timer
    if (scheduledStopAt) {
      const stopMs = new Date(scheduledStopAt).getTime() - Date.now();
      if (stopMs > 0) {
        procInfo.scheduledStopTimer = setTimeout(() => {
          addStreamLog({
            streamId: stream.id,
            jobId: job.id,
            severity: 'INFO',
            eventType: 'JOB_STOPPED',
            message: `Scheduled broadcast duration reached at ${scheduledStopAt}. Ending stream cleanly.`
          });
          this.stopStream(stream.id, 'SYSTEM_SCHEDULER');
        }, stopMs);
      }
    }

    this.activeProcesses.set(stream.id, procInfo);

    updateStreamingJob(job.id, {
      state: 'RUNNING',
      startedAt: new Date().toISOString()
    });
    updateStreamStatus(stream.id, 'LIVE', job.id);

    let connectedReported = false;

    // Stderr contains FFmpeg progress updates
    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      procInfo.lastProgressAt = Date.now();

      if (!connectedReported && (text.includes('Stream #') || text.includes('Output #0') || text.includes('frame='))) {
        connectedReported = true;
        addStreamLog({
          streamId: stream.id,
          jobId: job.id,
          severity: 'SUCCESS',
          eventType: 'OUTPUT_CONNECTED',
          message: 'Output connected to RTMP destination. Live relay active.'
        });
      }

      // Parse telemetry from progress lines
      // e.g. frame=  235 fps= 60 q=-1.0 size=    1536kB time=00:00:03.95 bitrate=3184.2kbits/s speed=1.0x
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);
      const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
      const dropMatch = text.match(/drop=\s*(\d+)/);
      const speedMatch = text.match(/speed=\s*([\d.]+x)/);

      if (fpsMatch || bitrateMatch) {
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : procInfo.lastFps;
        const bitrateKbps = bitrateMatch ? parseFloat(bitrateMatch[1]) : procInfo.lastBitrateKbps;
        const drops = dropMatch ? parseInt(dropMatch[1], 10) : procInfo.lastDropFrames;
        const uptime = Math.round((Date.now() - procInfo.startedAt) / 1000);

        procInfo.lastFps = fps;
        procInfo.lastBitrateKbps = bitrateKbps;
        procInfo.lastDropFrames = drops;
        procInfo.uptimeSeconds = uptime;

        const update: StreamTelemetryUpdate = {
          streamId: stream.id,
          jobId: job.id,
          status: 'LIVE',
          state: 'RUNNING',
          fps,
          bitrateKbps,
          dropFrames: drops,
          speed: speedMatch ? speedMatch[1] : '1.0x',
          uptimeSeconds: uptime,
          timestamp: new Date().toISOString()
        };

        this.emit('telemetry', update);
        this.emit(`telemetry:${stream.id}`, update);

        // Periodically update DB job record (every 10s roughly)
        if (uptime % 10 === 0) {
          updateStreamingJob(job.id, {
            currentFps: fps,
            currentBitrateKbps: bitrateKbps,
            currentDropFrames: drops,
            currentUptimeSeconds: uptime
          });
        }
      }
    });

    child.on('error', (err) => {
      addStreamLog({
        streamId: stream.id,
        jobId: job.id,
        severity: 'ERROR',
        eventType: 'JOB_FAILED',
        message: `FFmpeg process error: ${redactSecrets(err.message)}`
      });
    });

    child.on('close', (code, signal) => {
      if (procInfo.scheduledStopTimer) clearTimeout(procInfo.scheduledStopTimer);
      if (procInfo.watchdogTimer) clearInterval(procInfo.watchdogTimer);
      if (procInfo.stableTimer) clearTimeout(procInfo.stableTimer);

      this.activeProcesses.delete(stream.id);

      const totalUptime = Math.round((Date.now() - procInfo.startedAt) / 1000);

      if (procInfo.isIntentionalStop) {
        updateStreamingJob(job.id, {
          state: 'COMPLETED',
          stoppedAt: new Date().toISOString(),
          exitCode: code || 0,
          currentUptimeSeconds: totalUptime
        });
        updateStreamStatus(stream.id, 'STOPPED', null);
        addStreamLog({
          streamId: stream.id,
          jobId: job.id,
          severity: 'INFO',
          eventType: 'JOB_STOPPED',
          message: `Broadcast ended normally by user request. Total runtime: ${totalUptime}s`
        });
      } else {
        // UNINTENDED INTERRUPTION (source hiccup, ISP blip, or remote drop)
        // INFINITE AUTO-RECONNECT: NEVER give up, keep trying until the user explicitly says STOP!
        const nextAttempts = procInfo.reconnectAttempts + 1;
        // Fast backoff capped at 8 seconds so recovery is near-instant
        const backoffDelay = Math.min(8000, 2000 + Math.min(nextAttempts * 1000, 6000));

        updateStreamingJob(job.id, {
          state: 'RECONNECTING',
          reconnectCount: nextAttempts
        });
        updateStreamStatus(stream.id, 'RECONNECTING', job.id);

        addStreamLog({
          streamId: stream.id,
          jobId: job.id,
          severity: 'WARN',
          eventType: 'RECONNECT_ATTEMPT',
          message: `FFmpeg relay interrupted (code ${code}, signal ${signal}). Watchdog auto-reconnect attempt #${nextAttempts} in ${Math.round(backoffDelay / 1000)}s... (Stream will keep running indefinitely until manually stopped by user)`
        });

        const retryTimer = setTimeout(() => {
          this.reconnectTimers.delete(stream.id);
          const currentStream = getStreamById(stream.id);
          if (currentStream && currentStream.status === 'RECONNECTING') {
            this.spawnFfmpegProcess(currentStream, job, targetRtmpUrl, scheduledStopAt, nextAttempts);
          }
        }, backoffDelay);

        this.reconnectTimers.set(stream.id, retryTimer);
      }
    });
  }

  /**
   * Stop an active stream gracefully.
   */
  public async stopStream(streamId: string, userId: string): Promise<void> {
    // 1. Clear any pending retry timer if currently reconnecting
    const retryTimer = this.reconnectTimers.get(streamId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.reconnectTimers.delete(streamId);
    }

    const procInfo = this.activeProcesses.get(streamId);
    if (!procInfo) {
      // Force status update in DB if out of sync
      updateStreamStatus(streamId, 'STOPPED', null);
      return;
    }

    procInfo.isIntentionalStop = true;
    if (procInfo.scheduledStopTimer) clearTimeout(procInfo.scheduledStopTimer);
    if (procInfo.watchdogTimer) clearInterval(procInfo.watchdogTimer);
    if (procInfo.stableTimer) clearTimeout(procInfo.stableTimer);

    addAuditLog({
      userId,
      action: 'STREAM_STOP',
      resourceType: 'STREAM',
      resourceId: streamId,
      sanitizedMetadata: { jobId: procInfo.jobId }
    });

    addStreamLog({
      streamId,
      jobId: procInfo.jobId,
      severity: 'INFO',
      eventType: 'JOB_STOPPED',
      message: `Stop signal issued by user [${userId}]. Terminating FFmpeg process cleanly...`
    });

    updateStreamStatus(streamId, 'STOPPING');

    // On Windows, SIGINT cleanly tells FFmpeg to write trailer and exit
    try {
      procInfo.child.kill('SIGINT');
    } catch {
      procInfo.child.kill();
    }

    // Force kill if it hasn't exited within 3 seconds
    setTimeout(() => {
      try {
        if (!procInfo.child.killed) {
          procInfo.child.kill('SIGKILL');
        }
      } catch {
        // Ignored
      }
    }, 3000);
  }

  /**
   * Restart an active stream.
   */
  public async restartStream(streamId: string, userId: string): Promise<StreamingJob> {
    addAuditLog({
      userId,
      action: 'STREAM_RESTART',
      resourceType: 'STREAM',
      resourceId: streamId
    });

    if (this.activeProcesses.has(streamId)) {
      await this.stopStream(streamId, userId);
      // Brief pause to allow socket to release
      await new Promise(r => setTimeout(r, 1500));
    }

    return this.startStream(streamId, userId);
  }
}

export const streamingEngine = new StreamingEngine();
