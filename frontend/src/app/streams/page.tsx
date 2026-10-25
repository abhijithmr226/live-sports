'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Plus, 
  Search, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  ExternalLink, 
  Settings2,
  Tv2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import { Stream } from '@cloudcast/shared';

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const res = await api.getStreams(statusFilter === 'ALL' ? undefined : statusFilter);
      setStreams(res.streams || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [statusFilter]);

  const filtered = streams.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.sport.toLowerCase().includes(term) ||
      (s.destination?.name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Live Stream Channels</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage sports live feeds, inspect video telemetry, and control cloud FFmpeg relay instances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStreams}
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh streams"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/streams/create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Stream</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1726] border border-[#19263D] p-3 rounded-xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LIVE', 'READY', 'STOPPED', 'FAILED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#142033]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stream name, sport..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Streams Grid */}
      {loading ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center text-slate-400 text-xs animate-pulse">
          Fetching streaming channels from backend...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#162235] text-slate-400 flex items-center justify-center mx-auto">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No streams match your filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try choosing a different status filter or configure a new HLS broadcast relay.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((stream) => {
            const isLive = stream.status === 'LIVE' || stream.status === 'STARTING';
            return (
              <div
                key={stream.id}
                className="bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/streams/${stream.id}`} className="text-sm font-bold text-white hover:text-cyan-400 transition-colors">
                          {stream.name}
                        </Link>
                        <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded uppercase font-semibold">
                          {stream.sport}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {stream.description || 'No description provided'}
                      </p>
                    </div>

                    <span className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold uppercase shrink-0 ${
                      isLive 
                        ? 'bg-red-500 text-white pulse-onair' 
                        : stream.status === 'READY'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : stream.status === 'FAILED'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-700/60 text-slate-300'
                    }`}>
                      {stream.status}
                    </span>
                  </div>

                  {/* Telemetry Spec Badges */}
                  <div className="grid grid-cols-3 gap-2 mt-4 bg-[#121D2F] border border-[#1A2A42] rounded-lg p-2.5 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Input Codec</div>
                      <div className="text-xs font-semibold text-slate-200 mt-0.5">
                        {stream.probeResult?.videoCodec?.toUpperCase() || 'H.264'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Resolution</div>
                      <div className="text-xs font-semibold text-cyan-400 mt-0.5">
                        {stream.probeResult?.width ? `${stream.probeResult.width}p` : '1080p'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Relay Mode</div>
                      <div className="text-xs font-semibold text-slate-200 mt-0.5">
                        {stream.outputProfile?.mode || 'COPY'}
                      </div>
                    </div>
                  </div>

                  {/* Destination Information */}
                  <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-[#19263D]/60 pt-2.5">
                    <span className="flex items-center gap-1.5">
                      <Tv2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{stream.destination?.name || 'YouTube Live'}</span>
                    </span>
                    {stream.isPublicWatchEnabled && (
                      <Link
                        href={`/watch/${stream.publicWatchSlug || stream.id}`}
                        target="_blank"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Public Watch</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between border-t border-[#19263D] pt-3">
                  <Link
                    href={`/streams/${stream.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Control Room</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <button
                        onClick={async () => {
                          await api.stopStream(stream.id);
                          fetchStreams();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop Relay</span>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await api.startStream(stream.id);
                          fetchStreams();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Go Live</span>
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete stream "${stream.name}"?`)) {
                          await api.deleteStream(stream.id);
                          fetchStreams();
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Stream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
