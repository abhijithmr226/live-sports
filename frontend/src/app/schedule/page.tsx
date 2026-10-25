'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Plus, Clock, Globe, CheckCircle2, Trash2, Radio, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Schedule, Stream } from '@cloudcast/shared';

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Schedule Form State
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [hasStopTime, setHasStopTime] = useState(true);
  const [stopTime, setStopTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [recurrence, setRecurrence] = useState<'ONCE' | 'DAILY' | 'WEEKDAYS'>('ONCE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartTime(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    setStopTime(new Date(Date.now() + 7200000).toISOString().slice(0, 16));
    if (typeof Intl !== 'undefined') {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, streamsRes] = await Promise.all([
        api.getSchedules(),
        api.getStreams()
      ]);
      setSchedules(schedRes.schedules || []);
      setStreams(streamsRes.streams || []);
      if (streamsRes.streams?.length > 0) {
        setSelectedStreamId(streamsRes.streams[0].id);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createSchedule({
        streamId: selectedStreamId,
        startTime: new Date(startTime).toISOString(),
        stopTime: hasStopTime && stopTime ? new Date(stopTime).toISOString() : null,
        timezone,
        recurrence,
        enabled: true
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Automated Broadcast Schedule</h1>
          <p className="text-xs text-slate-400 mt-1">
            Timezone-aware durable scheduler. Cloud workers trigger streams automatically and enforce stop times.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Scheduled Broadcast</span>
        </button>
      </div>

      {/* Schedule Agenda List */}
      {loading ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center text-slate-400 text-xs animate-pulse">
          Loading broadcast schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Scheduled Broadcasts Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Schedule future sports feeds to start automatically without requiring you to be at your desk.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
          >
            Schedule a Broadcast
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#142033] border border-[#1E2E4A] flex items-center justify-center text-cyan-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      {s.stream?.name || 'Linked Stream'}
                    </span>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                      {s.recurrence}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      s.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {s.enabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-3 font-mono flex-wrap">
                    <span>Start: {new Date(s.startTime).toLocaleString()}</span>
                    <span>•</span>
                    <span>Stop: {s.stopTime ? new Date(s.stopTime).toLocaleString() : 'Manual Only'}</span>
                    <span>•</span>
                    <span>TZ: {s.timezone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/streams/${s.streamId}`}
                  className="px-3 py-1.5 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
                >
                  View Stream
                </Link>

                <button
                  onClick={async () => {
                    if (confirm('Delete this schedule?')) {
                      await api.deleteSchedule(s.id);
                      fetchData();
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Schedule Broadcast Relay
            </h2>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Stream Channel</label>
                <select
                  value={selectedStreamId}
                  onChange={(e) => setSelectedStreamId(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white"
                >
                  {streams.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.sport})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recurrence</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="ONCE">One-Time Only</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKDAYS">Monday - Friday</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    id="schedHasStop"
                    checked={hasStopTime}
                    onChange={(e) => setHasStopTime(e.target.checked)}
                    className="w-4 h-4 text-cyan-500 rounded"
                  />
                  <label htmlFor="schedHasStop" className="text-xs text-slate-300 cursor-pointer">
                    Enforce Stop Time (Recommended)
                  </label>
                </div>
                {hasStopTime && (
                  <input
                    type="datetime-local"
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    required
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#19263D]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#142033] hover:bg-[#1A2A42] text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
