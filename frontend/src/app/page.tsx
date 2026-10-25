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
  Sliders, 
  Layers, 
  Copy, 
  Check, 
  AlertTriangle, 
  Maximize2,
  Tv2,
  Plus,
  Settings,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { Stream, StreamTelemetryUpdate } from '@cloudcast/shared';

export default function OBSStudioPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [stream, setStream] = useState<Stream | null>(null);
  const [telemetry, setTelemetry] = useState<StreamTelemetryUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // OBS Controls State
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [sourceEditing, setSourceEditing] = useState(false);
  const [streamKeyInput, setStreamKeyInput] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [editingStreamKey, setEditingStreamKey] = useState(false);
  const [volumeGain, setVolumeGain] = useState<number>(0);
  const [audioFader, setAudioFader] = useState<number>(100);
  const [isMuted, setIsMuted] = useState(false);
  const [activeScene, setActiveScene] = useState<string>('Live Match Feed');
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayCopied, setOverlayCopied] = useState(false);

  // Video element & HLS player
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [videoPlaybackActive, setVideoPlaybackActive] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Scorebug State
  const [homeScore, setHomeScore] = useState(2);
  const [awayScore, setAwayScore] = useState(1);
  const [matchClock, setMatchClock] = useState('78:42');
  const [isGoalAnimation, setIsGoalAnimation] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const loadStreamDetails = async (id: string) => {
    try {
      const res = await api.getStream(id);
      if (res.stream) {
        setStream(res.stream);
        setSourceUrlInput(res.stream.sourceUrl);
        setStreamKeyInput(res.stream.destination?.maskedStreamKey || '');
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

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const es = new EventSource(`${API_BASE}/streams/${selectedStreamId}/live-feed`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.fps !== undefined || data.bitrateKbps !== undefined) {
          setTelemetry(data);
        }
      } catch {
        // SSE heartbeat parse
      }
    };

    return () => {
      es.close();
    };
  }, [selectedStreamId]);

  // Attach HLS player to 16:9 monitor when stream is active and source is M3U8
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
        backBufferLength: 30,
      });

      hls.loadSource(stream.sourceUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setVideoPlaybackActive(true);
        setVideoError(false);
        video.play().catch(() => {
          // Browser autoplay policy might require user click
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setVideoError(true);
          setVideoPlaybackActive(false);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
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
    setStatusMessage('Starting FFmpeg broadcast relay...');
    try {
      await api.startStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Stream relay is LIVE and transmitting to YouTube.');
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
    setStatusMessage('Restarting FFmpeg pipeline...');
    try {
      await api.restartStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Stream pipeline revived successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restart stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSourceUrl = async () => {
    if (!selectedStreamId || !sourceUrlInput.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateStream(selectedStreamId, {
        sourceUrl: sourceUrlInput.trim()
      });
      setSourceEditing(false);
      await loadStreamDetails(selectedStreamId);
      setStatusMessage('Source URL updated. Restart stream to apply changes.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update source URL');
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
      setStatusMessage(`Audio volume gain set to +${db}dB (applied to stream pipeline).`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      // Non-critical fallback
    }
  };

  const handleCopyOverlayUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const overlayUrl = `${origin}/overlays/isl-scorebug.html`;
    navigator.clipboard.writeText(overlayUrl);
    setOverlayCopied(true);
    setTimeout(() => setOverlayCopied(false), 2500);
  };

  const isLive = stream?.status === 'LIVE' || stream?.status === 'RECONNECTING';

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
          {/* OBS Studio Logo & Brand */}
          <div className="flex items-center gap-1.5 font-bold tracking-wide text-white">
            <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-[#18191c]">
              <Radio className="w-2.5 h-2.5" />
            </div>
            <span>OBS Studio Web 30.2</span>
          </div>

          {/* Classic OBS Menu Dropdowns */}
          <nav className="hidden md:flex items-center gap-3 text-slate-300 text-xs">
            <span className="hover:text-white cursor-pointer transition-colors">File</span>
            <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
            <span className="hover:text-white cursor-pointer transition-colors">View</span>
            <span className="hover:text-white cursor-pointer transition-colors">Docks</span>
            <span className="hover:text-white cursor-pointer transition-colors">Profile</span>
            <span className="hover:text-white cursor-pointer transition-colors">Scene Collection</span>
            <span className="hover:text-white cursor-pointer transition-colors">Tools</span>
            <span className="hover:text-white cursor-pointer transition-colors">Help</span>
          </nav>
        </div>

        {/* Right: Active Channel Selector & Auto-Revive Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121316] border border-[#2b2d31] text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Autonomous Watchdog: ACTIVE</span>
          </div>

          {/* Stream Selector */}
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
              title="Add New Stream Channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Status Notifications */}
      {error && (
        <div className="bg-rose-900/60 border-b border-rose-500/40 px-4 py-1.5 text-xs text-rose-200 flex items-center justify-between shrink-0">
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
        <div className="bg-cyan-900/40 border-b border-cyan-500/40 px-4 py-1.5 text-xs text-cyan-200 flex items-center justify-between shrink-0">
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
          2. MAIN WORKSPACE: PROGRAM MONITOR CANVAS (CENTER STAGE)
          ========================================================================= */}
      <div className="flex-1 flex flex-col p-2.5 min-h-0 bg-[#121316]">
        {/* Program Canvas Container */}
        <div className="flex-1 relative flex items-center justify-center bg-[#000000] rounded border border-[#2b2d31] overflow-hidden shadow-2xl">
          {/* Safe Area Guides */}
          <div className="absolute inset-4 border border-white/5 pointer-events-none z-10">
            <div className="w-3 h-3 border-t border-l border-white/20 absolute top-0 left-0"></div>
            <div className="w-3 h-3 border-t border-r border-white/20 absolute top-0 right-0"></div>
            <div className="w-3 h-3 border-b border-l border-white/20 absolute bottom-0 left-0"></div>
            <div className="w-3 h-3 border-b border-r border-white/20 absolute bottom-0 right-0"></div>
          </div>

          {/* Program Canvas HTML5/HLS Video Player */}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${videoPlaybackActive && !videoError ? 'block' : 'hidden'}`}
            muted={isMuted}
            playsInline
            autoPlay
          />

          {/* Fallback Live HUD (Shown when stream is LIVE or during player startup) */}
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
                      Broadcasting <span className="text-cyan-400 font-semibold">{stream?.name}</span> to YouTube Live
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 bg-[#18191c] border border-[#2b2d31] px-5 py-2 rounded font-mono text-xs shadow-inner">
                    <span className="text-slate-400">FPS: <strong className="text-cyan-400">{telemetry?.fps || 25}</strong></span>
                    <span className="text-slate-400">Bitrate: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)} kb/s</strong></span>
                    <span className="text-slate-400">Resolution: <strong className="text-slate-200">{stream?.probeResult?.width || 1280}x{stream?.probeResult?.height || 720}</strong></span>
                    <span className="text-slate-400">Drop Frames: <strong className="text-slate-300">{telemetry?.dropFrames || 0}</strong></span>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-slate-500">
                  <Tv2 className="w-12 h-12 mx-auto text-slate-600" />
                  <div className="text-sm font-bold text-slate-400">Program Canvas (Standby)</div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Click <strong className="text-emerald-400">&quot;START STREAMING&quot;</strong> in the Controls dock to start the live relay.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Live Scorebug Overlay inside Program Monitor */}
          {showOverlay && (
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
              <div className={`relative flex items-center h-11 bg-gradient-to-r from-[#0c166d] via-[#210940] to-[#0c166d] border border-cyan-500/40 rounded shadow-2xl overflow-hidden px-3 text-white transition-all ${
                isGoalAnimation ? 'scale-105 ring-2 ring-amber-400' : ''
              }`}>
                {/* Home */}
                <div className="flex items-center gap-2 pr-3 border-r border-white/20">
                  <span className="font-black text-xs tracking-wider text-amber-300">KBFC</span>
                  <span className="font-mono text-sm font-bold px-1.5 py-0.5 bg-black/50 rounded">{homeScore}</span>
                </div>
                {/* Clock */}
                <div className="px-3 font-mono text-xs text-slate-200 font-bold">
                  {matchClock}
                </div>
                {/* Away */}
                <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                  <span className="font-mono text-sm font-bold px-1.5 py-0.5 bg-black/50 rounded">{awayScore}</span>
                  <span className="font-black text-xs tracking-wider text-cyan-300">BFC</span>
                </div>

                {isGoalAnimation && (
                  <div className="absolute inset-0 bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center tracking-widest animate-pulse">
                    ⚽ GOAL! GOAL! GOAL!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canvas Floating Quick Controls (Top Bar) */}
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

          {/* Canvas Floating Quick Controls (Bottom Bar) */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/10 text-white transition-colors"
              title={isMuted ? 'Unmute Audio Preview' : 'Mute Audio Preview'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                showOverlay ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200' : 'bg-black/70 border-white/10 text-slate-400'
              }`}
            >
              Scorebug: {showOverlay ? 'ON' : 'OFF'}
            </button>
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

        {/* Quick Operator Bar (Under Canvas) */}
        <div className="mt-1 h-7 bg-[#1c1e22] border border-[#2b2d31] rounded px-3 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Match Score:</span>
            <button
              onClick={() => setHomeScore(s => s + 1)}
              className="px-2 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
            >
              KBFC +1
            </button>
            <button
              onClick={() => setAwayScore(s => s + 1)}
              className="px-2 py-0.2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold"
            >
              BFC +1
            </button>
            <button
              onClick={() => {
                setIsGoalAnimation(true);
                setTimeout(() => setIsGoalAnimation(false), 2500);
              }}
              className="px-2.5 py-0.2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shadow-sm"
            >
              Goal Alert
            </button>
            <button
              onClick={() => {
                setHomeScore(0);
                setAwayScore(0);
              }}
              className="px-1.5 py-0.2 rounded bg-[#2b2d31] hover:bg-[#383a40] text-slate-400 text-[10px]"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyOverlayUrl}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
            >
              {overlayCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{overlayCopied ? 'Copied' : 'Copy Browser Overlay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. OBS CLASSIC DOCKS (BOTTOM STRIP)
          ========================================================================= */}
      <div className="h-48 bg-[#1f2023] border-t border-[#2b2d31] grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#2b2d31] shrink-0 text-xs">
        {/* DOCK 1: SCENES */}
        <div className="p-2.5 flex flex-col justify-between">
          <div>
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Scenes</span>
              <span className="text-[10px] text-slate-500 font-mono">4</span>
            </div>

            <div className="space-y-1">
              {[
                'Live Match Feed',
                'Pre-Match Warmup',
                'Halftime Studio',
                'Scorebug Only'
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

            {/* Volume Gain Boost Selector */}
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

        {/* DOCK 4: STREAM DESTINATION */}
        <div className="p-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Stream Output</span>
              <span className="text-[10px] bg-red-600/20 text-red-400 px-1 py-0.2 rounded font-bold">
                YOUTUBE LIVE
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Server:</span>
                <div className="text-[10px] font-mono text-slate-300 truncate bg-[#121316] px-1.5 py-0.5 rounded border border-[#2b2d31]">
                  {stream?.destination?.ingestUrl || 'rtmp://a.rtmp.youtube.com/live2'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Stream Key:</span>
                  <button 
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-0.5"
                  >
                    {showStreamKey ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    <span>{showStreamKey ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 bg-[#121316] px-1.5 py-0.5 rounded border border-[#2b2d31] truncate">
                  {showStreamKey ? streamKeyInput || 'ymf2-8mr5-j6vg-jcgv-08b5' : 'ymf2-••••-••••-08b5'}
                </div>
              </div>

              {stream?.isPublicWatchEnabled && (
                <Link
                  href={`/watch/${stream.publicWatchSlug || stream.id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-1 w-full py-1 rounded bg-[#282a2e] hover:bg-[#313338] text-[10px] font-medium text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Watch Page</span>
                </Link>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2b2d31] truncate">
            Target: RTMP Primary Ingest
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

            {/* BIG ICONIC OBS START / STOP STREAMING BUTTON */}
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
                title="Restart FFmpeg Stream Relay Pipeline"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Restart</span>
              </button>

              <button
                onClick={handleCopyOverlayUrl}
                className="flex items-center justify-center gap-1 py-1.5 rounded bg-[#282a2e] hover:bg-[#313338] text-[11px] font-semibold text-slate-200 transition-colors"
                title="Copy Browser Overlay URL for OBS Studio"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Overlay</span>
              </button>
            </div>
          </div>

          <div className="p-1 rounded bg-[#121316] border border-[#2b2d31] text-[9px] text-slate-400 text-center font-mono">
            Auto-reconnects indefinitely.
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
          <span>kb/s: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)}</strong></span>
          <span>Drop: <strong className="text-slate-300">{telemetry?.dropFrames || 0} (0.0%)</strong></span>
          <span className="hidden sm:inline">Watchdog: <strong className="text-emerald-400">ACTIVE</strong></span>
        </div>
      </footer>
    </div>
  );
}
