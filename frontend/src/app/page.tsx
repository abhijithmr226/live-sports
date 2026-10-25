'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Play, 
  Square, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertTriangle, 
  Cpu, 
  Zap,
  Activity,
  RefreshCw,
  Eye,
  Tv2,
  Plus
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

  // OBS Controls State
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [sourceEditing, setSourceEditing] = useState(false);
  const [volumeGain, setVolumeGain] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayCopied, setOverlayCopied] = useState(false);

  // Scorebug State for fast operator triggers
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

      // Default to the first stream or active live stream
      if (list.length > 0) {
        const live = list.find(s => s.status === 'LIVE' || s.status === 'RECONNECTING');
        const activeId = selectedStreamId || (live ? live.id : list[0].id);
        setSelectedStreamId(activeId);
        loadStreamDetails(activeId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
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
        // Ignored
      }
    };

    return () => {
      es.close();
    };
  }, [selectedStreamId]);

  // OBS Action Handlers
  const handleStartStreaming = async () => {
    if (!selectedStreamId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.startStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopStreaming = async () => {
    if (!selectedStreamId) return;
    if (!confirm('OBS Studio: Stop live broadcast relay to destination?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.stopStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
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
    try {
      await api.restartStream(selectedStreamId);
      await loadStreamDetails(selectedStreamId);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update source URL');
    } finally {
      setActionLoading(false);
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

  // Format uptime to HH:MM:SS
  const formatUptime = (seconds: number = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          OBS STUDIO TOP TOOLBAR
          ========================================================================= */}
      <div className="bg-[#0C1220] border border-[#19263D] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: OBS Brand & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#142033] border border-[#233554] flex items-center justify-center text-cyan-400 shadow-sm">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
                CLOUD OBS STUDIO
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Persistent FFmpeg Cloud Relay
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#19263D] hidden sm:block"></div>

          {/* Broadcast Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070C16] border border-[#19263D]">
            <span className={`w-2.5 h-2.5 rounded-full ${
              stream?.status === 'LIVE' 
                ? 'bg-red-500 pulse-onair' 
                : stream?.status === 'RECONNECTING'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-600'
            }`} />
            <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
              stream?.status === 'LIVE' 
                ? 'text-red-400' 
                : stream?.status === 'RECONNECTING'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}>
              {stream?.status === 'LIVE' ? 'ON AIR' : stream?.status || 'STANDBY'}
            </span>
            {isLive && (
              <span className="text-xs font-mono font-bold text-slate-300 pl-1 border-l border-slate-700">
                {formatUptime(telemetry?.uptimeSeconds || stream?.currentJob?.currentUptimeSeconds || 0)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Channel Switcher & Quick Add */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStreamId}
            onChange={(e) => {
              setSelectedStreamId(e.target.value);
              loadStreamDetails(e.target.value);
            }}
            className="bg-[#121D2F] border border-[#1E2E4A] hover:border-cyan-500/40 text-xs font-semibold text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            {streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.status === 'LIVE' ? '🔴' : '⚪'} {s.name}
              </option>
            ))}
          </select>

          <Link
            href="/streams/create"
            className="p-2 rounded-lg bg-[#142033] border border-[#1E2E4A] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Create New Channel Preset"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN OBS PROGRAM MONITOR (PREVIEW CANVAS)
          ========================================================================= */}
      <div className="bg-[#070B14] border border-[#19263D] rounded-xl overflow-hidden shadow-2xl relative">
        {/* Canvas Header Bar */}
        <div className="bg-[#0B1220] border-b border-[#19263D] px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tv2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Program Monitor</span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({stream?.probeResult?.width || 1280}x{stream?.probeResult?.height || 720} @ {stream?.probeResult?.fps || 25} FPS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                showOverlay 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Scorebug Overlay: {showOverlay ? 'VISIBLE' : 'HIDDEN'}
            </button>
            <button
              onClick={handleCopyOverlayUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#142033] border border-[#1E2E4A] hover:border-indigo-500/40 text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              {overlayCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{overlayCopied ? 'Link Copied!' : 'Copy Overlay URL'}</span>
            </button>
          </div>
        </div>

        {/* 16:9 Broadcast Stage Canvas */}
        <div className="relative aspect-video w-full flex items-center justify-center bg-black overflow-hidden">
          {/* Subtle Video Crosshair Safe Area Grid (OBS style) */}
          <div className="absolute inset-4 border border-white/5 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-4 h-4 border-t border-l border-white/10 absolute top-0 left-0"></div>
            <div className="w-4 h-4 border-t border-r border-white/10 absolute top-0 right-0"></div>
            <div className="w-4 h-4 border-b border-l border-white/10 absolute bottom-0 left-0"></div>
            <div className="w-4 h-4 border-b border-r border-white/10 absolute bottom-0 right-0"></div>
          </div>

          {/* Active Live Broadcast HUD */}
          {isLive ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#080D18]">
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center pulse-onair">
                <Radio className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white tracking-wide flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  LIVE ON AIR RELAY ACTIVE
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  Transmitting to <span className="text-cyan-400 font-mono font-semibold">{stream?.destination?.name}</span> via FFmpeg FLV pipeline.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 bg-[#0B1322] border border-[#1E2E4A] px-5 py-2.5 rounded-xl font-mono text-xs shadow-inner">
                <div className="text-slate-400">
                  FPS: <span className="text-cyan-400 font-bold">{telemetry?.fps || 25}</span>
                </div>
                <div className="text-slate-400">
                  Bitrate: <span className="text-emerald-400 font-bold">{Math.round(telemetry?.bitrateKbps || 2400)} kb/s</span>
                </div>
                <div className="text-slate-400">
                  Drops: <span className="text-slate-300 font-bold">{telemetry?.dropFrames || 0}</span>
                </div>
                <div className="text-slate-400">
                  Speed: <span className="text-slate-200">{telemetry?.speed || '1.0x'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2 p-6 text-slate-500">
              <Tv2 className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-sm font-bold text-slate-300">Studio Channel Inactive</div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Press &quot;START STREAMING&quot; in the Controls dock to begin the live broadcast relay.
              </p>
            </div>
          )}

          {/* Interactive Live Scorebug Overlay Render */}
          {showOverlay && (
            <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-20">
              <div className={`relative flex items-center h-12 bg-gradient-to-r from-[#101a8c] via-[#31004b] to-[#12145b] border border-[#445b90]/60 rounded-md shadow-2xl overflow-hidden px-3 text-white transition-all ${
                isGoalAnimation ? 'scale-105 ring-2 ring-amber-400' : ''
              }`}>
                {/* Home Team */}
                <div className="flex items-center gap-2 pr-3 border-r border-white/20">
                  <span className="font-extrabold text-xs tracking-wider text-amber-300">KBFC</span>
                  <span className="font-mono text-sm font-bold px-1.5 py-0.5 bg-black/40 rounded">{homeScore}</span>
                </div>

                {/* Clock */}
                <div className="px-3 font-mono text-xs text-slate-200 font-bold">
                  {matchClock}
                </div>

                {/* Away Team */}
                <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                  <span className="font-mono text-sm font-bold px-1.5 py-0.5 bg-black/40 rounded">{awayScore}</span>
                  <span className="font-extrabold text-xs tracking-wider text-cyan-300">MCFC</span>
                </div>

                {/* Goal Flash Banner */}
                {isGoalAnimation && (
                  <div className="absolute inset-0 bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center tracking-widest animate-pulse">
                    ⚽ GOAL! GOAL! GOAL!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Match Operator Bar (Under Canvas) */}
        <div className="bg-[#09101C] border-t border-[#19263D] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Scorebug Controls:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHomeScore(s => s + 1)}
              className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold transition-colors"
            >
              KBFC +1
            </button>
            <button
              onClick={() => setAwayScore(s => s + 1)}
              className="px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors"
            >
              MCFC +1
            </button>
            <button
              onClick={() => {
                setIsGoalAnimation(true);
                setTimeout(() => setIsGoalAnimation(false), 2500);
              }}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
            >
              Goal Alert
            </button>
            <button
              onClick={() => {
                setHomeScore(0);
                setAwayScore(0);
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OBS DOCKS GRID (SOURCES, AUDIO MIXER, OUTPUT, CONTROLS)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* DOCK 1: SOURCES (MEDIA INPUT) */}
        <div className="bg-[#0C1220] border border-[#19263D] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tv2 className="w-3.5 h-3.5 text-cyan-400" />
                1. Media Source
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {stream?.probeResult?.format?.toUpperCase() || 'HLS'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Source Stream URL
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={sourceUrlInput}
                  onChange={(e) => {
                    setSourceUrlInput(e.target.value);
                    setSourceEditing(true);
                  }}
                  placeholder="https://...m3u8, rtsp://..., rtmp://..."
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                {sourceEditing && (
                  <button
                    onClick={handleSaveSourceUrl}
                    disabled={actionLoading}
                    className="w-full py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
                  >
                    Apply New Source URL
                  </button>
                )}
              </div>
            </div>

            {/* Quick Format Chips */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[
                { label: '⚡ HLS', url: 'https://stream.ottplus.live/live/ten_1_hd_abr/live/ten_1_hd_720/chunks.m3u8' },
                { label: '📹 RTSP', url: 'rtsp://' },
                { label: '🚀 RTMP', url: 'rtmp://' },
                { label: '📁 MP4', url: 'https://' }
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSourceUrlInput(chip.url);
                    setSourceEditing(true);
                  }}
                  className="px-2 py-0.5 rounded bg-[#121D2F] border border-[#1E2E4A] hover:border-cyan-500/40 text-[10px] text-slate-300 font-mono"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-[#19263D]">
            Codec: <span className="text-slate-200">{stream?.probeResult?.videoCodec?.toUpperCase() || 'H.264'} / {stream?.probeResult?.audioCodec?.toUpperCase() || 'AAC'}</span>
          </div>
        </div>

        {/* DOCK 2: AUDIO MIXER (OBS STYLE VU METER) */}
        <div className="bg-[#0C1220] border border-[#19263D] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                2. Audio Mixer
              </span>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1 rounded ${isMuted ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                title="Mute Audio"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* OBS Animated VU Audio Level Meter */}
            <div className="space-y-1.5 font-mono text-[10px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>L (Left Channel)</span>
                  <span className="text-emerald-400">{isLive && !isMuted ? '-12 dB' : '-∞ dB'}</span>
                </div>
                <div className="h-2 bg-[#121D2F] rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-full transition-all duration-150"
                    style={{ width: isLive && !isMuted ? '72%' : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>R (Right Channel)</span>
                  <span className="text-emerald-400">{isLive && !isMuted ? '-14 dB' : '-∞ dB'}</span>
                </div>
                <div className="h-2 bg-[#121D2F] rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-full transition-all duration-150"
                    style={{ width: isLive && !isMuted ? '68%' : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* Volume Gain Boost */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Audio Gain Boost
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0, 3, 6, 10].map((db) => (
                  <button
                    key={db}
                    onClick={() => setVolumeGain(db)}
                    className={`py-1 rounded text-[11px] font-mono font-bold border transition-colors ${
                      volumeGain === db 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                        : 'bg-[#121D2F] border-[#1E2E4A] text-slate-400 hover:text-white'
                    }`}
                  >
                    +{db}dB
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-[#19263D]">
            Standard: <span className="text-slate-200">AAC Stereo 44.1 kHz</span>
          </div>
        </div>

        {/* DOCK 3: STREAM OUTPUT (DESTINATION) */}
        <div className="bg-[#0C1220] border border-[#19263D] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                3. Stream Output
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-bold font-mono">
                {stream?.destination?.type || 'YOUTUBE'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400">Target Ingest Server</label>
                <div className="text-slate-200 font-mono text-[11px] truncate bg-[#121D2F] px-2.5 py-1.5 rounded-lg border border-[#1E2E4A] mt-0.5">
                  {stream?.destination?.ingestUrl || 'rtmp://a.rtmp.youtube.com/live2'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400">Stream Key</label>
                <div className="text-emerald-400 font-mono text-[11px] bg-[#121D2F] px-2.5 py-1.5 rounded-lg border border-[#1E2E4A] mt-0.5 flex items-center justify-between">
                  <span>••••••••••••08b5</span>
                  <span className="text-[10px] text-slate-400">AES-256</span>
                </div>
              </div>

              {stream?.isPublicWatchEnabled && (
                <Link
                  href={`/watch/${stream.publicWatchSlug || stream.id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#142033] border border-[#1E2E4A] hover:border-cyan-500/40 text-xs font-semibold text-cyan-400 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Public Watch Page</span>
                </Link>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-[#19263D]">
            Destination: <span className="text-slate-200">YouTube Live Primary Ingest</span>
          </div>
        </div>

        {/* DOCK 4: OBS CONTROLS (BIG TACTILE ACTIONS) */}
        <div className="bg-[#0C1220] border border-[#19263D] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                4. Controls
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                Watchdog: ON
              </span>
            </div>

            {/* BIG PRIMARY OBS START / STOP BUTTON */}
            {isLive ? (
              <button
                onClick={handleStopStreaming}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm shadow-xl shadow-red-600/30 transition-all cursor-pointer min-h-[52px]"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>STOP STREAMING</span>
              </button>
            ) : (
              <button
                onClick={handleStartStreaming}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer min-h-[52px]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START STREAMING</span>
              </button>
            )}

            {/* Secondary OBS Control Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRestartStreaming}
                disabled={actionLoading || !isLive}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#142033] hover:bg-[#1E2E4A] disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restart</span>
              </button>

              <button
                onClick={handleCopyOverlayUrl}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#142033] hover:bg-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Overlay Link</span>
              </button>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#070C16] border border-[#19263D] text-[10px] text-slate-400 text-center font-mono">
            Relay auto-reconnects indefinitely until stopped.
          </div>
        </div>
      </div>

      {/* =========================================================================
          OBS STATUS BAR (BOTTOM TELEMETRY)
          ========================================================================= */}
      <div className="bg-[#080D18] border border-[#19263D] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className={isLive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isLive ? 'STREAMING ACTIVE' : 'STREAMING STOPPED'}
            </span>
          </span>
          <span>|</span>
          <span>LIVE: <strong className="text-white">{formatUptime(telemetry?.uptimeSeconds || stream?.currentJob?.currentUptimeSeconds || 0)}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>FPS: <strong className="text-cyan-400">{telemetry?.fps || 25}</strong></span>
          <span>kb/s: <strong className="text-emerald-400">{Math.round(telemetry?.bitrateKbps || 2400)}</strong></span>
          <span>CPU: <strong className="text-slate-300">1.8%</strong></span>
          <span>Dropped: <strong className="text-slate-300">{telemetry?.dropFrames || 0} (0.0%)</strong></span>
        </div>
      </div>
    </div>
  );
}
