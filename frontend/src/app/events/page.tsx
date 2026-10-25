'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Plus, 
  Search, 
  Clock, 
  MapPin, 
  Radio, 
  Trash2, 
  Edit3, 
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { SportsEvent, SportCategory } from '@cloudcast/shared';

const SPORTS: SportCategory[] = [
  'FOOTBALL', 'BASKETBALL', 'TENNIS', 'BASEBALL', 
  'CRICKET', 'MOTORSPORTS', 'ESPORTS', 'COMBAT', 'RUGBY', 'OTHER'
];

export default function SportsEventsPage() {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportCategory>('FOOTBALL');
  const [competition, setCompetition] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [venue, setVenue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [broadcastNotes, setBroadcastNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getEvents(search);
      setEvents(res.events || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createEvent({
        title: title.trim() || `${homeTeam} vs ${awayTeam}`,
        sport,
        competition: competition.trim(),
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        venue: venue.trim() || undefined,
        startTime: new Date(startTime).toISOString(),
        broadcastNotes: broadcastNotes.trim() || undefined,
        publicWatchEnabled: true
      });
      setIsModalOpen(false);
      // Reset
      setTitle('');
      setHomeTeam('');
      setAwayTeam('');
      setCompetition('');
      setVenue('');
      fetchEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sports event');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Sports Events & Match Fixtures</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize competitions, matches, and associate multi-camera feeds with official fixture schedules.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sports Event</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-[#0E1726] border border-[#19263D] p-3 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search team, competition, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center text-slate-400 text-xs animate-pulse">
          Loading sports events...
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Sports Events Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create match fixtures to associate multiple streaming camera angles and broadcast schedules.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
          >
            Create Sports Fixture
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                    {ev.competition}
                  </span>
                  <span className="text-[10px] bg-[#162235] text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                    {ev.sport}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{ev.homeTeam} vs {ev.awayTeam}</span>
                  </h3>
                  {ev.title && ev.title !== `${ev.homeTeam} vs ${ev.awayTeam}` && (
                    <p className="text-xs text-slate-400 mt-0.5">{ev.title}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-[#19263D]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(ev.startTime).toLocaleString()}</span>
                  </div>
                  {ev.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.venue}</span>
                    </div>
                  )}
                </div>

                {ev.broadcastNotes && (
                  <p className="text-[11px] text-slate-400 bg-[#121D2F] p-2.5 rounded-lg border border-[#1E2E4A]">
                    {ev.broadcastNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#19263D] pt-3">
                <span className="text-[10px] text-slate-400 font-mono">
                  Status: <strong className="text-emerald-400">{ev.status}</strong>
                </span>

                <button
                  onClick={async () => {
                    if (confirm(`Delete fixture "${ev.homeTeam} vs ${ev.awayTeam}"?`)) {
                      await api.deleteEvent(ev.id);
                      fetchEvents();
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              Add Match / Sports Fixture
            </h2>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sport</label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as SportCategory)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Competition / League *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premier League, NBA"
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Home Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arsenal"
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Away Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chelsea"
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kickoff / Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue / Stadium</label>
                  <input
                    type="text"
                    placeholder="e.g. Emirates Stadium, London"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Broadcast Production Notes</label>
                <textarea
                  rows={2}
                  placeholder="Camera layout, live commentary language, graphics overlay notes..."
                  value={broadcastNotes}
                  onChange={(e) => setBroadcastNotes(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
