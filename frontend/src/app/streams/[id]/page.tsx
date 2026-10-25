'use client';

import { useState, useEffect, useRef, use, Suspense } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RotateCcw, 
  Radio, 
  Tv2, 
  Share2, 
  Activity, 
  Clock, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Volume2, 
  Layers,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { Stream, StreamLog, StreamTelemetryUpdate } from '@cloudcast/shared';

function StreamControlContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stream, setStream] = useState<Stream | null>(null);
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  // Real-time telemetry state
  const [telemetry, setTelemetry] = useState<StreamTelemetryUpdate | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const overlayIframeRef = useRef<HTMLIFrameElement>(null);

  const sendOverlayAction = (action: string, celebrate = false) => {
    overlayIframeRef.current?.contentWindow?.postMessage({ action, celebrate }, '*');
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [sRes, lRes] = await Promise.all([
        api.getStream(id),
        api.getStreamLogs(id)
      ]);
      setStream(sRes.stream);
      setLogs(lRes.logs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stream details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Setup Server-Sent Events (SSE) connection for live telemetry
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const es = new EventSource(`${API_BASE}/streams/${id}/live-feed`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CONNECTED') {
          // Connected
        } else if (data.fps !== undefined || data.bitrateKbps !== undefined) {
          setTelemetry(data);
        }
      } catch {
        // Ignored
      }
    };

    return () => {
      es.close();
    };
  }, [id]);

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.startStream(id);
      await fetchDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop the live broadcast relay?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.stopStream(id);
      await fetchDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to stop stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm('Restart active broadcast relay? (May cause a brief 2-3 second flicker on destination)')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.restartStream(id);
      await fetchDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restart stream');
    } finally {
      setActionLoading(false);
    }
  };

  const isLive = stream?.status === 'LIVE' || stream?.status === 'STARTING' || stream?.status === 'RECONNECTING';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/streams"
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-wide">{stream?.name || 'Loading Stream...'}</h1>
              <span className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                stream?.status === 'LIVE' 
                  ? 'bg-red-500 text-white pulse-onair' 
                  : stream?.status === 'RECONNECTING'
                  ? 'bg-amber-500 text-black font-extrabold animate-pulse'
                  : stream?.status === 'STARTING'
                  ? 'bg-blue-500 text-white animate-pulse'
                  : stream?.status === 'READY'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {stream?.status || 'IDLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Channel ID: <span className="font-mono text-slate-300">{id}</span> • Sport: <span className="text-cyan-400 font-semibold">{stream?.sport}</span>
            </p>
          </div>
        </div>

        {/* Control Room Actions */}
        <div className="flex items-center gap-2">
          {stream?.isPublicWatchEnabled && (
            <Link
              href={`/watch/${stream.publicWatchSlug || stream.id}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Watch Page</span>
            </Link>
          )}

          <button
            onClick={fetchDetails}
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Details"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isLive ? (
            <>
              <button
                onClick={handleRestart}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restart</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Broadcast</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Go Live (Start Relay)</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Video Feed Preview & Real-Time Telemetry Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Monitor & Real-Time Telemetry HUD */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Monitor */}
          <div className="bg-[#0A101D] border border-[#19263D] rounded-xl overflow-hidden aspect-video relative flex items-center justify-center shadow-2xl">
            {isLive ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#080D18]">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center pulse-onair">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white tracking-wide flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    ACTIVE RELAY BROADCAST IN PROGRESS
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    FFmpeg is currently demuxing the authorized HLS source and streaming to <span className="text-cyan-400 font-mono">{stream?.destination?.name}</span>.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-[#0E1726] border border-[#1E2E4A] px-4 py-2 rounded-lg font-mono text-xs">
                  <div className="text-slate-400">
                    FPS: <span className="text-cyan-400 font-bold">{telemetry?.fps || stream?.probeResult?.fps || 60}</span>
                  </div>
                  <div className="text-slate-400">
                    Bitrate: <span className="text-emerald-400 font-bold">{Math.round(telemetry?.bitrateKbps || stream?.outputProfile?.videoBitrate || 4500)} kbps</span>
                  </div>
                  <div className="text-slate-400">
                    Speed: <span className="text-slate-200">{telemetry?.speed || '1.0x'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 p-6 text-slate-500">
                <Tv2 className="w-12 h-12 mx-auto text-slate-600" />
                <div className="text-sm font-semibold text-slate-400">Broadcast Channel Standby</div>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Click &quot;Go Live&quot; to initialize cloud FFmpeg relay to the destination endpoint.
                </p>
              </div>
            )}

            {/* Live ISL Scorebug Broadcast Graphics Overlay */}
            {showOverlay && (
              <div className="absolute inset-0 pointer-events-none z-20 flex items-start justify-center pt-1 overflow-hidden">
                <iframe
                  ref={overlayIframeRef}
                  src="/overlays/isl-scorebug.html?controls=0&scale=0.85"
                  className="w-full h-full border-0 bg-transparent pointer-events-auto"
                />
              </div>
            )}

            {/* Top-Left Live Badge Overlay */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                isLive ? 'bg-red-600 text-white pulse-onair' : 'bg-black/60 text-slate-400 border border-slate-700'
              }`}>
                {isLive ? 'ON AIR' : 'OFF AIR'}
              </span>
              <span className="bg-black/60 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
                {stream?.outputProfile?.mode || 'COPY'}
              </span>
            </div>

            {/* Top-Right Uptime Stopwatch Overlay */}
            {isLive && (
              <div className="absolute top-3 right-3 z-30 bg-black/70 border border-slate-800 px-2.5 py-0.5 rounded text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Uptime: {telemetry?.uptimeSeconds ? `${Math.floor(telemetry.uptimeSeconds / 60)}m ${telemetry.uptimeSeconds % 60}s` : '0m 0s'}</span>
              </div>
            )}
          </div>

          {/* ISL Live Graphics Scorebug Controller */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">ISL Scorebug Broadcast Graphics Controller</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    showOverlay ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {showOverlay ? 'Overlay Visible on Feed' : 'Overlay Hidden'}
                </button>
                <a
                  href="/overlays/isl-scorebug.html"
                  target="_blank"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                  title="Open full transparent overlay for OBS / vMix Browser Source"
                >
                  OBS Browser Source ↗
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => sendOverlayAction('SCORE_HOME')}
                  className="flex-1 py-1.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs font-bold transition-colors"
                >
                  KBFC +1
                </button>
                <button
                  type="button"
                  onClick={() => sendOverlayAction('SCORE_HOME', true)}
                  className="px-2 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm"
                >
                  Goal!
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => sendOverlayAction('SCORE_AWAY')}
                  className="flex-1 py-1.5 rounded bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 text-xs font-bold transition-colors"
                >
                  MCFC +1
                </button>
                <button
                  type="button"
                  onClick={() => sendOverlayAction('SCORE_AWAY', true)}
                  className="px-2 py-1.5 rounded bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-extrabold shadow-sm"
                >
                  Goal!
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => sendOverlayAction('START_CLOCK')}
                  className="flex-1 py-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                >
                  Start Clock
                </button>
                <button
                  type="button"
                  onClick={() => sendOverlayAction('PAUSE_CLOCK')}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Pause
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => sendOverlayAction('HALF_TIME')}
                  className="flex-1 py-1.5 rounded bg-[#162235] hover:bg-[#1E2D45] text-slate-300 text-xs font-medium"
                >
                  HT
                </button>
                <button
                  type="button"
                  onClick={() => sendOverlayAction('FULL_TIME')}
                  className="flex-1 py-1.5 rounded bg-[#162235] hover:bg-[#1E2D45] text-slate-300 text-xs font-medium"
                >
                  FT
                </button>
                <button
                  type="button"
                  onClick={() => sendOverlayAction('RESET')}
                  className="px-2 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry Gauge Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-3 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Output Bitrate</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {telemetry?.bitrateKbps ? `${Math.round(telemetry.bitrateKbps)}k` : isLive ? '4,500k' : '--'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Target: {stream?.outputProfile?.videoBitrate || 4500} kbps</div>
            </div>

            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-3 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Frame Rate</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {telemetry?.fps ? `${telemetry.fps} fps` : isLive ? '60 fps' : '--'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Input: {stream?.probeResult?.fps || 60} fps</div>
            </div>

            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-3 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dropped Frames</div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                {telemetry?.dropFrames || 0}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">0.0% Network Drop</div>
            </div>

            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-3 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Audio Telemetry</div>
              <div className="text-lg font-bold font-mono text-indigo-400 mt-1 flex items-center justify-center gap-1">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>AAC 128k</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">48 kHz • Stereo</div>
            </div>
          </div>

          {/* Real-time FFmpeg Console & Event Terminal */}
          <div className="bg-[#080D18] border border-[#19263D] rounded-xl overflow-hidden shadow-inner">
            <div className="bg-[#0E1726] px-4 py-2.5 border-b border-[#19263D] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Broadcast Log Terminal</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{logs.length} events logged</span>
            </div>

            <div ref={logContainerRef} className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-8">
                  No log entries for this channel yet.
                </div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    <span className="text-slate-500 shrink-0">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-1 py-0.2 rounded uppercase text-[9px] font-bold shrink-0 ${
                      l.severity === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                      l.severity === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                      l.severity === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {l.eventType}
                    </span>
                    <span className="text-slate-300 break-all">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Configuration & Destination Details */}
        <div className="space-y-6">
          {/* Target Destination Card */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Destination Ingest</span>
              </div>
              <span className="text-[10px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                {stream?.destination?.type || 'YOUTUBE'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Target Name:</span>
                <div className="text-white font-semibold mt-0.5">{stream?.destination?.name}</div>
              </div>
              <div>
                <span className="text-slate-400">Ingest URL:</span>
                <div className="text-slate-300 font-mono text-[11px] break-all mt-0.5">{stream?.destination?.ingestUrl}</div>
              </div>
              <div>
                <span className="text-slate-400">Stream Key Status:</span>
                <div className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AES-256-GCM Encrypted at Rest</span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Specification Card */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#19263D] pb-3 text-xs font-bold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Input & Codec Profile</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Relay Strategy:</span>
                <span className="text-cyan-400 font-bold">{stream?.outputProfile?.mode || 'COPY'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Input Resolution:</span>
                <span className="text-slate-200">{stream?.probeResult?.width}x{stream?.probeResult?.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Video Codec:</span>
                <span className="text-slate-200">{stream?.probeResult?.videoCodec?.toUpperCase() || 'H.264'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Audio Codec:</span>
                <span className="text-slate-200">{stream?.probeResult?.audioCodec?.toUpperCase() || 'AAC'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Audio Channels:</span>
                <span className="text-slate-200">{stream?.probeResult?.audioChannels || 2} Stereo</span>
              </div>
            </div>
          </div>

          {/* Cloud Resilience Card */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Cloud Independence</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This broadcast is processed on persistent infrastructure. Closing your browser or turning off your PC will not disrupt the YouTube Live transmission.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STICKY MOBILE BROADCAST DOCK (Always accessible thumb-zone controls)
          ========================================================================= */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-2.5 bg-[#09101F]/95 backdrop-blur-md border-t border-[#1C2C47] md:hidden shadow-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-1">
          <span className={`w-3 h-3 rounded-full shrink-0 ${
            stream?.status === 'LIVE' 
              ? 'bg-red-500 pulse-onair' 
              : stream?.status === 'RECONNECTING'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-slate-600'
          }`} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
              <span>{stream?.status || 'IDLE'}</span>
              {telemetry?.fps ? (
                <span className="text-[10px] text-cyan-400 font-mono">
                  {telemetry.fps} FPS
                </span>
              ) : null}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {telemetry?.uptimeSeconds ? `${Math.floor(telemetry.uptimeSeconds / 60)}m uptime` : 'Ready to air'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLive ? (
            <>
              <button
                onClick={handleRestart}
                disabled={actionLoading}
                className="p-3 rounded-xl bg-[#142033] border border-[#1E2E4A] text-slate-300 active:scale-95 transition-transform"
                title="Restart Relay"
                aria-label="Restart Relay"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition-all min-h-[48px]"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>STOP</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition-all min-h-[48px]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>GO LIVE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StreamControlPanel({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Connecting to Stream Control Room...</div>}>
      <StreamControlContent params={params} />
    </Suspense>
  );
}
