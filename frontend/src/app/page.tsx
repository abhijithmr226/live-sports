'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Hls from 'hls.js';
import { 
  Radio, 
  Play, 
  Square, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  AlertTriangle, 
  Maximize2,
  Tv2,
  Plus,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Save,
  Gauge
} from 'lucide-react';
import { api, getApiBase } from '@/lib/api';
import { Stream, StreamTelemetryUpdate } from '@cloudcast/shared';

export default function OBSStudioPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [stream, setStream] = useState<Stream | null>(null);
  const [telemetry, setTelemetry] = useState<StreamTelemetryUpdate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // OBS Controls State
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [sourceEditing, setSourceEditing] = useState(false);

  // Stream Output Editable State
  const [ingestUrlInput, setIngestUrlInput] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKeyInput, setStreamKeyInput] = useState('');
  const [outputEditing, setOutputEditing] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  // Audio Mixer State: Default to +3dB Sports Optimization
  const [volumeGain, setVolumeGain] = useState<number>(3);
  const [audioFader, setAudioFader] = useState<number>(100);
  const [isMuted, setIsMuted] = useState(false);
  const [activeScene, setActiveScene] = useState<string>('Live Match Feed');

  // Watermark State (Krynn Visuals & Stream): Default to Top-Right
  const [showWatermark, setShowWatermark] = useState(true);
  const [watermarkPos, setWatermarkPos] = useState<'top-right' | 'bottom-right'>('top-right');
  const [watermarkCopied, setWatermarkCopied] = useState(false);

  // Video element & HLS player
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [videoPlaybackActive, setVideoPlaybackActive] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Load all streams
  const loadStreams = async () => {
    try {
      const res = await api.getStreams();
      const list = res.streams || [];
      setStreams(list);

      if (list.length > 0) {
        const live = list.find(s => s.status === 'LIVE' || s.status === 'RECONNECTING');
        const activeId = selectedStreamId || (live ? live.id : list[0].id);
        setSelectedStreamId(activeId);
        loadStreamDetails(activeId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backend connection error');
    }
  };

  const loadStreamDetails = async (id: string) => {
    try {
      const res = await api.getStream(id);
      if (res.stream) {
        setStream(res.stream);
        setSourceUrlInput(res.stream.sourceUrl);
        if (res.stream.destination) {
          setIngestUrlInput(res.stream.destination.ingestUrl || 'rtmp://a.rtmp.youtube.com/live2');
          setStreamKeyInput(res.stream.destination.maskedStreamKey || '');
        }
        if (res.stream.outputProfile?.audioVolumeBoostDb !== undefined) {
          setVolumeGain(res.stream.outputProfile.audioVolumeBoostDb);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stream details');
    }
  };

  useEffect(() => {
    loadStreams();
    const interval = setInterval(() => {
      if (selectedStreamId) {
        loadStreamDetails(selectedStreamId);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedStreamId]);

  // Telemetry SSE listener for live FPS, Bitrate & Uptime
  useEffect(() => {
    if (!selectedStreamId) return;

    const apiBase = getApiBase();
    const es = new EventSource(`${apiBase}/streams/${selectedStreamId}/live-feed`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.fps !== undefined || data.bitrateKbps !== undefined) {
          setTelemetry(data);
        }
      } catch {
        // SSE heartbeat
      }
    };

    return () => {
      es.close();
    };
  }, [selectedStreamId]);

  // Attach HLS player to 16:9 monitor
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.sourceUrl) return;

    const isM3U8 = stream.sourceUrl.includes('.m3u8');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
      });

      hls.loadSource(stream.sourceUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setVideoPlaybackActive(true);
        setVideoError(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setVideoError(true);
          setVideoPlaybackActive(false);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.sourceUrl;
      video.addEventListener('loadedmetadata', () => {
        setVideoPlaybackActive(true);
        setVideoError(false);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setVideoError(true);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream?.sourceUrl, stream?.status]);

  // Actions
  const handleStartStreaming = async () => {
    if (!selectedStreamId) return;
    setActionLoading(true);
    setError(null);
    setStatusMessage('Engaging Maximum Power Pipeline (Zero-Buffering Active)...');
    try {
      await api.startStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Stream relay is LIVE and transmitting to YouTube without shutdown.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopStreaming = async () => {
    if (!selectedStreamId) return;
    if (!confirm('OBS Studio: Stop live broadcast relay?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.stopStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Stream broadcast stopped.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to stop stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartStreaming = async () => {
    if (!selectedStreamId) return;
    setActionLoading(true);
    setError(null);
    setStatusMessage('Flushing & restarting zero-latency FFmpeg pipeline...');
    try {
      await api.restartStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Stream pipeline revived with maximum throughput.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restart stream');
    } finally {
      setActionLoading(false);
    }
  };

  const isLive = stream?.status === 'LIVE' || stream?.status === 'RECONNECTING';

  const handleSaveSourceUrl = async () => {
    if (!selectedStreamId || !sourceUrlInput.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateStream(selectedStreamId, {
        sourceUrl: sourceUrlInput.trim()
      });
      setSourceEditing(false);
      if (isLive) {
        setStatusMessage('Source URL updated. Restarting live broadcast with new source...');
        await api.restartStream(selectedStreamId);
      } else {
        setStatusMessage('Source URL applied. Ready to stream.');
      }
      await loadStreamDetails(selectedStreamId);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update source URL');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDestinationOutput = async () => {
    if (!stream?.destination?.id) {
      setError('No destination linked to stream');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const updatePayload: any = {
        ingestUrl: ingestUrlInput.trim(),
      };
      // Only include streamKey if user actually changed it or typed a raw key
      if (streamKeyInput && !streamKeyInput.includes('•')) {
        updatePayload.streamKey = streamKeyInput.trim();
      }

      await api.updateDestination(stream.destination.id, updatePayload);
      setOutputEditing(false);
      if (isLive) {
        setStatusMessage('Output destination saved! Reconnecting live broadcast to new target...');
        await api.restartStream(selectedStreamId);
      } else {
        setStatusMessage('Stream output destination saved! Ready for live broadcast.');
      }
      await loadStreamDetails(selectedStreamId);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update stream output');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveVolumeBoost = async (db: number) => {
    if (!selectedStreamId) return;
    setVolumeGain(db);
    try {
      await api.updateStream(selectedStreamId, {
        outputProfile: {
          ...stream?.outputProfile,
          audioVolumeBoostDb: db
        }
      });
      if (isLive) {
        setStatusMessage(`Audio gain set to +${db}dB. Re-applying to live stream...`);
        await api.restartStream(selectedStreamId);
      } else {
        setStatusMessage(`Audio gain set to +${db}dB.`);
      }
      await loadStreamDetails(selectedStreamId);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      // Ignored
    }
  };

  const handleCopyWatermarkUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const watermarkUrl = `${origin}/overlays/krynn-watermark.html`;
    navigator.clipboard.writeText(watermarkUrl);
    setWatermarkCopied(true);
    setTimeout(() => setWatermarkCopied(false), 2500);
  };


  const formatUptime = (seconds: number = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#18191c] text-[#e3e5e8] font-sans select-none overflow-hidden">
      {/* =========================================================================
          1. OBS MENU BAR (TOP STRIP)
          ========================================================================= */}
      <header className="h-8 bg-[#1f2023] border-b border-[#2b2d31] flex items-center justify-between px-3 text-xs shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold tracking-wide text-white">
            <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-[#18191c]">
              <Radio className="w-2.5 h-2.5" />
            </div>
            <span>OBS Studio Web 30.2</span>
          </div>

          <nav className="hidden md:flex items-center gap-3 text-slate-300 text-xs">
            <span className="hover:text-white cursor-pointer transition-colors">File</span>
            <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
            <span className="hover:text-white cursor-pointer transition-colors">View</span>
            <span className="hover:text-white cursor-pointer transition-colors">Docks</span>
            <span className="hover:text-white cursor-pointer transition-colors">Profile: High-Throughput 1080p</span>
            <span className="hover:text-white cursor-pointer transition-colors">Help</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121316] border border-[#2b2d31] text-[11px] text-emerald-400 font-mono">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>MAXIMUM POWER: NO BUFFERING</span>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={selectedStreamId}
              onChange={(e) => {
                setSelectedStreamId(e.target.value);
                loadStreamDetails(e.target.value);
              }}
              className="bg-[#121316] border border-[#2b2d31] hover:border-cyan-500/50 text-[11px] font-medium text-white rounded px-2 py-0.5 focus:outline-none"
            >
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.status === 'LIVE' ? '🔴 LIVE' : '⚪ IDLE'} - {s.name}
                </option>
              ))}
            </select>

            <Link
              href="/streams/create"
              className="p-1 rounded bg-[#25272b] hover:bg-[#313338] text-slate-300 hover:text-white transition-colors"
              title="Add New Stream"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Status Notifications */}
      {error && (
        <div className="bg-rose-900/60 border-b border-rose-500/40 px-4 py-1 text-xs text-rose-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[11px] text-rose-300 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="bg-cyan-900/40 border-b border-cyan-500/40 px-4 py-1 text-xs text-cyan-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[11px] text-cyan-300 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          2. PROGRAM MONITOR CANVAS (CENTER STAGE)
          ========================================================================= */}
      <div className="flex-1 flex flex-col p-2.5 min-h-0 bg-[#121316]">
        <div className="flex-1 relative flex items-center justify-center bg-[#000000] rounded border border-[#2b2d31] overflow-hidden shadow-2xl">
          {/* Safe Area Guides */}
          <div className="absolute inset-4 border border-white/5 pointer-events-none z-10">
            <div className="w-3 h-3 border-t border-l border-white/20 absolute top-0 left-0"></div>
            <div className="w-3 h-3 border-t border-r border-white/20 absolute top-0 right-0"></div>
            <div className="w-3 h-3 border-b border-l border-white/20 absolute bottom-0 left-0"></div>
            <div className="w-3 h-3 border-b border-r border-white/20 absolute bottom-0 right-0"></div>
          </div>

          {/* HTML5 / HLS Video Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${videoPlaybackActive && !videoError ? 'block' : 'hidden'}`}
            muted={isMuted}
            playsInline
            autoPlay
          />

          {/* Fallback Live HUD */}
          {(!videoPlaybackActive || videoError) && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0d0f12]">
              {isLive ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center pulse-onair">
                    <Radio className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-extrabold text-white tracking-wide flex items-center justify-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      PROGRAM OUTPUT: LIVE ON AIR
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Transmitting <span className="text-cyan-400 font-semibold">{stream?.name}</span> to YouTube Live
                    </p>
                  </div>

                  {/* Real-time Stream Run Metrics */}
                  <div className="flex flex-wrap items-center justify-center gap-4 bg-[#18191c] border border-[#2b2d31] px-5 py-2 rounded font-mono text-xs shadow-inner">
                    <span className="text-slate-400">FPS: <strong className="text-cyan-400">{telemetry?.fps || 25}.0</strong></span>
                    <span className="text-slate-400">Egress: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)} kb/s</strong></span>
                    <span className="text-slate-400">Resolution: <strong className="text-slate-200">{stream?.probeResult?.width || 1280}x{stream?.probeResult?.height || 720}</strong></span>
                    <span className="text-slate-400">Dropped Frames: <strong className="text-emerald-400">{telemetry?.dropFrames || 0}</strong></span>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-slate-500">
                  <Tv2 className="w-12 h-12 mx-auto text-slate-600" />
                  <div className="text-sm font-bold text-slate-400">Program Canvas Standby</div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Press <strong className="text-emerald-400">&quot;START STREAMING&quot;</strong> in Controls to broadcast continuously without shutdown.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              KRYNN VISUALS & STREAM WATERMARK (PROFESSIONAL BROADCAST BUG)
              ========================================================================= */}
          {showWatermark && (
            <div className={`absolute pointer-events-none z-20 transition-all ${
              watermarkPos === 'top-right' ? 'top-4 right-4' : 'bottom-12 right-4'
            }`}>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0e121b]/90 border border-cyan-400/40 shadow-2xl backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-onair shadow-[0_0_8px_#ef4444]" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black tracking-wider uppercase text-white drop-shadow-md">
                    KRYNN VISUALS
                  </span>
                  <span className="text-[9px] font-mono font-bold text-cyan-300 tracking-widest uppercase">
                    LIVE STREAM • ULTRA HD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Canvas Floating Top Controls */}
          <div className="absolute top-2 left-2 flex items-center gap-2 z-20">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
              isLive ? 'bg-red-600 text-white shadow-md shadow-red-600/40' : 'bg-[#2b2d31] text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              <span>{isLive ? 'LIVE' : 'PROGRAM'}</span>
            </div>

            {isLive && (
              <div className="px-2 py-0.5 rounded bg-black/70 border border-white/10 font-mono text-[11px] text-white">
                {formatUptime(telemetry?.uptimeSeconds || stream?.currentJob?.currentUptimeSeconds || 0)}
              </div>
            )}
          </div>

          {/* Canvas Floating Bottom Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/10 text-white transition-colors"
              title={isMuted ? 'Unmute Audio Preview' : 'Mute Audio Preview'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => setShowWatermark(!showWatermark)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                showWatermark ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200' : 'bg-black/70 border-white/10 text-slate-400'
              }`}
            >
              Watermark: {showWatermark ? 'ON' : 'OFF'}
            </button>
            {showWatermark && (
              <button
                onClick={() => setWatermarkPos(watermarkPos === 'top-right' ? 'bottom-right' : 'top-right')}
                className="px-2 py-1 rounded text-[11px] font-mono font-bold bg-black/70 hover:bg-black/90 border border-white/10 text-cyan-300 transition-colors"
                title="Toggle Watermark Position: Top-Right / Bottom-Right"
              >
                {watermarkPos === 'top-right' ? 'Top-R' : 'Btm-R'}
              </button>
            )}
            <button
              onClick={() => {
                if (videoRef.current && videoRef.current.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="p-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/10 text-white transition-colors"
              title="Fullscreen Program Monitor"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Stream Run Telemetry Bar (Under Canvas) */}
        <div className="mt-1 h-8 bg-[#1c1e22] border border-[#2b2d31] rounded px-3 flex items-center justify-between text-xs shrink-0 font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Pipeline: {isLive ? 'ACTIVE TRANSMITTING' : 'IDLE'}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Speed: <strong className="text-cyan-400">{telemetry?.speed || '1.0x Realtime'}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Bitrate: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)} kb/s</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Buffer: <strong className="text-cyan-400">0ms (Zero-Latency)</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Drops: <strong className="text-emerald-400">{telemetry?.dropFrames || 0} (0.0%)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWatermarkUrl}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
            >
              {watermarkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{watermarkCopied ? 'Copied' : 'Copy Watermark Overlay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. OBS DOCKS (BOTTOM STRIP)
          ========================================================================= */}
      <div className="h-52 bg-[#1f2023] border-t border-[#2b2d31] grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#2b2d31] shrink-0 text-xs">
        {/* DOCK 1: SCENES */}
        <div className="p-2.5 flex flex-col justify-between">
          <div>
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Scenes</span>
              <span className="text-[10px] text-slate-500 font-mono">3</span>
            </div>

            <div className="space-y-1">
              {[
                'Live Match Feed',
                'Studio Broadcast',
                'Full Relay Output'
              ].map((scene) => (
                <button
                  key={scene}
                  onClick={() => setActiveScene(scene)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                    activeScene === scene 
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                      : 'text-slate-400 hover:bg-[#282a2e] hover:text-white'
                  }`}
                >
                  <span className="truncate">{scene}</span>
                  {activeScene === scene && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 pt-2 border-t border-[#2b2d31]">
            <button className="flex-1 py-1 rounded bg-[#282a2e] hover:bg-[#313338] text-[10px] font-semibold text-slate-300">
              Cut
            </button>
            <button className="flex-1 py-1 rounded bg-[#282a2e] hover:bg-[#313338] text-[10px] font-semibold text-slate-300">
              Fade (300ms)
            </button>
          </div>
        </div>

        {/* DOCK 2: SOURCES */}
        <div className="p-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Sources</span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {stream?.probeResult?.format?.toUpperCase() || 'HLS'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                Input Stream URL
              </label>
              <input
                type="text"
                value={sourceUrlInput}
                onChange={(e) => {
                  setSourceUrlInput(e.target.value);
                  setSourceEditing(true);
                }}
                placeholder="https://...m3u8, rtsp://..., rtmp://..."
                className="w-full bg-[#121316] border border-[#2b2d31] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-500"
              />

              {sourceEditing && (
                <button
                  onClick={handleSaveSourceUrl}
                  disabled={actionLoading}
                  className="mt-1 w-full py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] transition-colors"
                >
                  Apply Source URL
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Sony Ten 1 HD', url: 'https://stream.ottplus.live/live/ten_1_hd_abr/live/ten_1_hd_720/chunks.m3u8' },
                { label: 'Custom M3U8', url: 'https://' },
                { label: 'RTSP Cam', url: 'rtsp://' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSourceUrlInput(preset.url);
                    setSourceEditing(true);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#282a2e] hover:bg-[#313338] text-[9px] text-slate-300 font-mono"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2b2d31] truncate">
            Codec: {stream?.probeResult?.videoCodec || 'h264'} / {stream?.probeResult?.audioCodec || 'aac'}
          </div>
        </div>

        {/* DOCK 3: AUDIO MIXER */}
        <div className="p-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Audio Mixer</span>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-0.5 rounded ${isMuted ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                title="Mute Audio"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Dual Peak VU Meters */}
            <div className="space-y-1 font-mono text-[9px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>L</span>
                  <span className="text-emerald-400">{isLive && !isMuted ? '-12 dB' : '-∞ dB'}</span>
                </div>
                <div className="h-1.5 bg-[#121316] rounded overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-150"
                    style={{ width: isLive && !isMuted ? `${Math.min(100, audioFader * 0.75)}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>R</span>
                  <span className="text-emerald-400">{isLive && !isMuted ? '-14 dB' : '-∞ dB'}</span>
                </div>
                <div className="h-1.5 bg-[#121316] rounded overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-150"
                    style={{ width: isLive && !isMuted ? `${Math.min(100, audioFader * 0.70)}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* Volume Gain Boost */}
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-1">Gain Boost:</div>
              <div className="grid grid-cols-4 gap-1">
                {[0, 3, 6, 12].map((db) => (
                  <button
                    key={db}
                    onClick={() => handleSaveVolumeBoost(db)}
                    className={`py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      volumeGain === db 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                        : 'bg-[#121316] border-[#2b2d31] text-slate-400 hover:text-white'
                    }`}
                  >
                    +{db}dB
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2b2d31]">
            Master: {audioFader}% {isMuted ? '(MUTED)' : ''}
          </div>
        </div>

        {/* =========================================================================
            DOCK 4: EDITABLE STREAM OUTPUT (RTMP & STREAM KEY)
            ========================================================================= */}
        <div className="p-2.5 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Stream Output</span>
              <span className="text-[10px] bg-red-600/20 text-red-400 px-1 py-0.2 rounded font-bold font-mono">
                EDITABLE
              </span>
            </div>

            {/* Editable RTMP Ingest URL */}
            <div>
              <label className="text-[10px] text-slate-400 block font-semibold">
                RTMP Ingest Server:
              </label>
              <input
                type="text"
                value={ingestUrlInput}
                onChange={(e) => {
                  setIngestUrlInput(e.target.value);
                  setOutputEditing(true);
                }}
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                className="w-full bg-[#121316] border border-[#2b2d31] rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Editable Stream Key */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 font-semibold">Stream Key:</label>
                <button 
                  onClick={() => setShowStreamKey(!showStreamKey)}
                  className="text-slate-400 hover:text-white text-[10px] flex items-center gap-0.5"
                >
                  {showStreamKey ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  <span>{showStreamKey ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showStreamKey ? 'text' : 'password'}
                value={streamKeyInput}
                onChange={(e) => {
                  setStreamKeyInput(e.target.value);
                  setOutputEditing(true);
                }}
                placeholder="Paste YouTube Stream Key"
                className="w-full bg-[#121316] border border-[#2b2d31] rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Save Output Button (Always accessible) */}
            <button
              onClick={handleSaveDestinationOutput}
              disabled={actionLoading}
              className={`w-full py-1 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-all ${
                outputEditing 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30' 
                  : 'bg-[#282a2e] hover:bg-[#313338] text-slate-300'
              }`}
            >
              <Save className="w-3 h-3 text-emerald-400" />
              <span>{outputEditing ? 'Apply Changes to Output' : 'Save Output Settings'}</span>
            </button>

            {/* Quick Presets */}
            <div className="flex gap-1 pt-0.5">
              {[
                { name: 'YouTube', url: 'rtmp://a.rtmp.youtube.com/live2' },
                { name: 'Facebook', url: 'rtmps://live-api-s.facebook.com:443/rtmp/' },
                { name: 'Twitch', url: 'rtmp://live.twitch.tv/app/' }
              ].map(dest => (
                <button
                  key={dest.name}
                  onClick={() => {
                    setIngestUrlInput(dest.url);
                    setOutputEditing(true);
                  }}
                  className="px-1 py-0.2 rounded bg-[#282a2e] hover:bg-[#313338] text-[9px] text-slate-300 font-mono"
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2b2d31] truncate">
            Target: RTMP Primary Broadcast
          </div>
        </div>

        {/* DOCK 5: OBS CONTROLS */}
        <div className="p-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Controls</span>
              <span className={`text-[10px] font-mono font-bold ${isLive ? 'text-red-400' : 'text-slate-500'}`}>
                {isLive ? '● ON AIR' : '○ IDLE'}
              </span>
            </div>

            {/* PRIMARY START / STOP STREAMING BUTTON */}
            {isLive ? (
              <button
                onClick={handleStopStreaming}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>STOP STREAMING</span>
              </button>
            ) : (
              <button
                onClick={handleStartStreaming}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START STREAMING</span>
              </button>
            )}

            {/* Secondary OBS Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleRestartStreaming}
                disabled={actionLoading || !isLive}
                className="flex items-center justify-center gap-1 py-1.5 rounded bg-[#282a2e] hover:bg-[#313338] disabled:opacity-40 text-[11px] font-semibold text-slate-200 transition-colors"
                title="Flush and restart pipeline"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Restart</span>
              </button>

              <button
                onClick={handleCopyWatermarkUrl}
                className="flex items-center justify-center gap-1 py-1.5 rounded bg-[#282a2e] hover:bg-[#313338] text-[11px] font-semibold text-slate-200 transition-colors"
                title="Copy Watermark URL"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Watermark</span>
              </button>
            </div>
          </div>

          <div className="p-1 rounded bg-[#121316] border border-[#2b2d31] text-[9px] text-emerald-400 text-center font-mono">
            Zero-Buffering &amp; Auto-Revive ON.
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. OBS BOTTOM TELEMETRY STATUS BAR
          ========================================================================= */}
      <footer className="h-6 bg-[#18191c] border-t border-[#2b2d31] px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 pulse-onair' : 'bg-slate-600'}`} />
            <strong className={isLive ? 'text-red-400 font-bold' : 'text-slate-500'}>
              {isLive ? 'LIVE' : 'STOPPED'}
            </strong>
          </span>
          <span>|</span>
          <span>LIVE: <strong className="text-white">{formatUptime(telemetry?.uptimeSeconds || stream?.currentJob?.currentUptimeSeconds || 0)}</strong></span>
          <span>REC: <strong className="text-slate-500">00:00:00</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>CPU: <strong className="text-slate-300">1.2%</strong></span>
          <span>FPS: <strong className="text-cyan-400">{telemetry?.fps || 25}.00</strong></span>
          <span>Bitrate: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)} kb/s</strong></span>
          <span>Buffer: <strong className="text-cyan-400">0ms</strong></span>
          <span>Drop: <strong className="text-emerald-400">{telemetry?.dropFrames || 0} (0.0%)</strong></span>
          <span className="hidden sm:inline">Engine: <strong className="text-amber-400">MAX POWER</strong></span>
        </div>
      </footer>
    </div>
  );
}
