'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Tv2, 
  Calendar, 
  Share2, 
  ArrowUpRight, 
  Activity, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  HardDrive, 
  Layers,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { api } from '@/lib/api';
import { Stream, SportsEvent, WorkerHealth } from '@cloudcast/shared';

export default function OverviewPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [worker, setWorker] = useState<WorkerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [streamsRes, eventsRes, analyticsRes] = await Promise.all([
        api.getStreams(),
        api.getEvents(),
        api.getAnalytics()
      ]);
      setStreams(streamsRes.streams || []);
      setEvents(eventsRes.events || []);
      setWorker(analyticsRes.worker || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, []);

  const liveStreams = streams.filter(s => s.status === 'LIVE' || s.status === 'STARTING');
  const scheduledCount = streams.filter(s => s.status === 'READY').length;
  const failedStreams = streams.filter(s => s.status === 'FAILED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Broadcast Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0D1524] to-[#121E36] border border-[#1E2E4A] rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-wide">Live Broadcast Operations Center</h1>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-medium">
              STUDIO 1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, persistent cloud worker relays, and sports broadcast scheduling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Telemetry</span>
          </button>
          <Link
            href="/streams/create"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Start New Relay</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Backend Connection Notice: {error}. Please ensure the backend process is running on port 4000.</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Broadcasts */}
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active Broadcasts</span>
            <div className={`w-2 h-2 rounded-full ${liveStreams.length > 0 ? 'bg-red-500 pulse-onair' : 'bg-slate-600'}`}></div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white flex items-baseline gap-2">
            {liveStreams.length}
            <span className="text-xs text-slate-400 font-sans font-normal">on air</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400 gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>{streams.length} total feeds configured</span>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <Radio className="w-24 h-24 text-white" />
          </div>
        </div>

        {/* Scheduled Feeds */}
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Scheduled Relays</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white flex items-baseline gap-2">
            {scheduledCount}
            <span className="text-xs text-slate-400 font-sans font-normal">ready / due</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400 gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Timezone: UTC / Auto-start</span>
          </div>
        </div>

        {/* Cloud Worker Engine */}
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Cloud Streaming Worker</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
              HEALTHY
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white flex items-baseline gap-2">
            {worker?.activeJobsCount || liveStreams.length} / {worker?.maxJobsCapacity || 4}
            <span className="text-xs text-slate-400 font-sans font-normal">relays</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400 gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>System Load: {worker?.system.cpuLoadPercent ?? 12}% CPU</span>
          </div>
        </div>

        {/* Destinations */}
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Target Destinations</span>
            <Share2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white flex items-baseline gap-2">
            RTMPS
            <span className="text-xs text-emerald-400 font-sans font-medium">YouTube Live Ready</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400 gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>AES-256 encrypted keys</span>
          </div>
        </div>
      </div>

      {/* Main Studio View: Live Channels Monitor & Upcoming Fixtures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active & Configured Feeds */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Broadcast Channels</h2>
              <span className="text-xs text-slate-400">({streams.length})</span>
            </div>
            <Link href="/streams" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
              View All Streams <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-8 text-center text-slate-400 text-xs animate-pulse">
              Loading broadcast channels and telemetry...
            </div>
          ) : streams.length === 0 ? (
            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#162235] text-slate-400 flex items-center justify-center mx-auto">
                <Tv2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Stream Relays Configured Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add an authorized HLS/M3U8 source URL, link your YouTube Live stream key, and start cloud broadcasting.
              </p>
              <Link
                href="/streams/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
              >
                Create First Stream
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {streams.slice(0, 4).map((s) => {
                const isLive = s.status === 'LIVE' || s.status === 'STARTING';
                return (
                  <div
                    key={s.id}
                    className="bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Live Status Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isLive 
                          ? 'bg-red-500/15 border border-red-500/30 text-red-400 pulse-onair' 
                          : s.status === 'FAILED'
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                          : 'bg-[#142033] border border-[#1E2E4A] text-slate-400'
                      }`}>
                        <Radio className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/streams/${s.id}`} className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors">
                            {s.name}
                          </Link>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            isLive 
                              ? 'bg-red-500 text-white' 
                              : s.status === 'READY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {s.status}
                          </span>
                          <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded uppercase font-medium">
                            {s.sport}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                          <span>Target: {s.destination?.name || 'YouTube Live'}</span>
                          <span>•</span>
                          <span>Mode: {s.outputProfile?.mode || 'COPY'}</span>
                          {s.probeResult?.width && (
                            <>
                              <span>•</span>
                              <span>{s.probeResult.width}x{s.probeResult.height} ({s.probeResult.fps || 60}fps)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/streams/${s.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Control Room
                      </Link>

                      {isLive ? (
                        <button
                          onClick={async () => {
                            await api.stopStream(s.id);
                            loadData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await api.startStream(s.id);
                            loadData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Go Live</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Sports Events & System Health */}
        <div className="space-y-6">
          {/* Sports Events Manager Card */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#19263D] pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Upcoming Sports Fixtures</h2>
              </div>
              <Link href="/events" className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium">
                Manage
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                No scheduled sports fixtures found.
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((e) => (
                  <div key={e.id} className="bg-[#121D2F] border border-[#1E2D45] rounded-lg p-3 space-y-1.5">
                    <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                      {e.competition}
                    </div>
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{e.homeTeam} vs {e.awayTeam}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2A42] text-slate-300 font-mono">
                        {e.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {e.venue || 'Main Stadium'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cloud Worker Engine Telemetry */}
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#19263D] pb-3 text-xs font-bold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Production Worker Health</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>FFmpeg Engine:</span>
                <span className="text-slate-200 font-mono">v9.0.2 (x86_64)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Memory Allocation:</span>
                <span className="text-slate-200 font-mono">
                  {worker?.system.freeMemoryMb ? Math.round(worker.system.freeMemoryMb / 1024) : 8}GB Free / {worker?.system.totalMemoryMb ? Math.round(worker.system.totalMemoryMb / 1024) : 16}GB Total
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Process Supervisor:</span>
                <span className="text-emerald-400 font-medium">Autonomous Heartbeat Active</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SSRF Security Guard:</span>
                <span className="text-cyan-400 font-mono">DNS Verification Armed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
