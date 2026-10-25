import express, { Request, Response } from 'express';
import cors from 'cors';
import { CONFIG } from './config';
import authRoutes from './routes/auth';
import streamsRoutes from './routes/streams';
import destinationsRoutes from './routes/destinations';
import schedulesRoutes from './routes/schedules';
import eventsRoutes from './routes/events';
import analyticsRoutes from './routes/analytics';
import logsRoutes from './routes/logs';
import systemRoutes from './routes/system';
import publicWatchRoutes from './routes/publicWatch';
import { streamingEngine } from './services/streamingWorker';
import { durableScheduler } from './services/scheduler';

const app = express();

// Security and CORS middleware
app.use(cors({
  origin: true, // Allow frontend dev server and public watch clients
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CloudCast Sports Studio Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    ffmpegInstalled: true
  });
});

// Real-Time Server-Sent Events (SSE) telemetry feed for a specific stream
app.get('/api/streams/:id/live-feed', (req: Request, res: Response) => {
  const streamId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial connection heartbeat
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', streamId, timestamp: new Date().toISOString() })}\n\n`);

  const onTelemetry = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  streamingEngine.on(`telemetry:${streamId}`, onTelemetry);

  // Send periodic keepalive ping every 15s to prevent proxy timeouts
  const keepAliveTimer = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    streamingEngine.off(`telemetry:${streamId}`, onTelemetry);
  });
});

// System-wide live events feed
app.get('/api/events/live-feed', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'GLOBAL_CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  const onGlobalTelemetry = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  streamingEngine.on('telemetry', onGlobalTelemetry);

  const timer = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  _req.on('close', () => {
    clearInterval(timer);
    streamingEngine.off('telemetry', onGlobalTelemetry);
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/public/watch', publicWatchRoutes);

// Global 404 handler
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Startup sequence
async function startServer() {
  // 1. Reconcile previous interrupted jobs
  await streamingEngine.reconcileJobsOnStartup();

  // 2. Start durable scheduler
  durableScheduler.start();

  // 3. Start autonomous dead-man revival watchdog
  streamingEngine.startAutonomousRevivalWatchdog();

  // 4. Listen on configured port
  app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`[CloudCast Sports Studio] Backend API active on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`[CloudCast Sports Studio] Worker ID: ${CONFIG.WORKER_ID} | Max Jobs: ${CONFIG.MAX_CONCURRENT_JOBS}`);

    // 4. Anti-Sleep Keepalive Heartbeat: Pings health endpoint every 10 minutes
    // to prevent free cloud containers (e.g. Render, Koyeb) from idling into sleep mode
    const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${CONFIG.PORT}`;
    setInterval(() => {
      fetch(`${selfUrl}/api/health`)
        .then(() => console.log('[CloudCast Sports Studio] Keep-alive heartbeat dispatched'))
        .catch(() => {});
    }, 10 * 60 * 1000);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[CloudCast Sports Studio] Shutting down gracefully...');
  durableScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[CloudCast Sports Studio] Terminating processes...');
  durableScheduler.stop();
  process.exit(0);
});

startServer().catch((err) => {
  console.error('[CloudCast Sports Studio] Fatal error during startup:', err);
  process.exit(1);
});
