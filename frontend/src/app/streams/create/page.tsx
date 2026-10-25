'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Radio, 
  Tv2, 
  Share2, 
  Sliders, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { Destination, SportsEvent, StreamProbeResult, SportCategory } from '@cloudcast/shared';

const SPORTS: SportCategory[] = [
  'FOOTBALL', 'BASKETBALL', 'TENNIS', 'BASEBALL', 
  'CRICKET', 'MOTORSPORTS', 'ESPORTS', 'COMBAT', 'RUGBY', 'OTHER'
];

export default function CreateStreamWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportCategory>('FOOTBALL');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState<string>('');
  const [tags, setTags] = useState('1080p, live, sports');
  const [isPublicWatch, setIsPublicWatch] = useState(true);
  const [publicSlug, setPublicSlug] = useState('');

  // Source State
  const [sourceUrl, setSourceUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  const [authHeader, setAuthHeader] = useState('');
  const [sourceNotes, setSourceNotes] = useState('Authorized live HLS sports stream feed');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<StreamProbeResult | null>(null);

  // Destination State
  const [destinationId, setDestinationId] = useState('');

  // Output Profile State
  const [transcodeMode, setTranscodeMode] = useState<'COPY' | 'TRANSCODE'>('COPY');
  const [videoBitrate, setVideoBitrate] = useState(4500);
  const [fps, setFps] = useState(60);
  const [resolution, setResolution] = useState<'source' | '1080p' | '720p'>('source');

  // Schedule State
  const [startType, setStartType] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [startTime, setStartTime] = useState('');
  const [hasStopTime, setHasStopTime] = useState(false);
  const [stopTime, setStopTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    setStartTime(new Date().toISOString().slice(0, 16));
    if (typeof Intl !== 'undefined') {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load existing destinations and events
    Promise.all([api.getDestinations(), api.getEvents()]).then(([destRes, evRes]) => {
      setDestinations(destRes.destinations || []);
      if (destRes.destinations?.length > 0) {
        setDestinationId(destRes.destinations[0].id);
      }
      setEvents(evRes.events || []);
    }).catch(() => {});
  }, []);

  const handleProbeSource = async () => {
    if (!sourceUrl.trim()) return;
    setProbing(true);
    setProbeResult(null);
    setError(null);
    try {
      const res = await api.validateSource({
        sourceUrl: sourceUrl.trim(),
        authHeader: authHeader.trim() || undefined
      });
      setProbeResult(res);
      if (!res.valid) {
        setError(res.error || 'Source stream is unreachable or invalid');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to probe source');
    } finally {
      setProbing(false);
    }
  };

  const handleSubmit = async (startImmediately: boolean) => {
    setError(null);
    setSaving(true);
    try {
      const created = await api.createStream({
        name: name.trim(),
        description: description.trim() || undefined,
        sport,
        eventId: eventId || null,
        sourceUrl: sourceUrl.trim(),
        sourceNotes: sourceNotes.trim() || undefined,
        destinationId,
        outputProfile: {
          mode: transcodeMode,
          resolution,
          videoBitrate,
          fps,
          videoCodec: transcodeMode === 'TRANSCODE' ? 'libx264' : 'copy',
          audioCodec: 'aac',
          audioBitrate: 128
        },
        probeResult: probeResult || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        isPublicWatchEnabled: isPublicWatch,
        publicWatchSlug: publicSlug.trim() || undefined
      });

      const newStream = created.stream;

      // If scheduled, create schedule record
      if (startType === 'SCHEDULED' && startTime) {
        await api.createSchedule({
          streamId: newStream.id,
          startTime: new Date(startTime).toISOString(),
          stopTime: hasStopTime && stopTime ? new Date(stopTime).toISOString() : null,
          timezone,
          recurrence: 'ONCE',
          enabled: true
        });
      }

      // If requested to start immediately
      if (startImmediately) {
        await api.startStream(newStream.id);
      }

      router.push(`/streams/${newStream.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/streams"
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Stream Broadcast Creation Wizard</h1>
            <p className="text-xs text-slate-400">Configure sports HLS input, probe stream codecs, and set cloud relay targets.</p>
          </div>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4 flex items-center justify-between">
        {[
          { num: 1, label: 'Details' },
          { num: 2, label: 'Source' },
          { num: 3, label: 'Destination' },
          { num: 4, label: 'Output Profile' },
          { num: 5, label: 'Schedule' },
          { num: 6, label: 'Review & Launch' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.num
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/30'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#142033] text-slate-500 border border-[#1E2E4A]'
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </div>
            <span className={`text-xs hidden sm:inline ${step === s.num ? 'text-white font-semibold' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Details */}
      {step === 1 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#19263D] pb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Step 1: Stream & Sports Identity
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stream Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Santiago Bernabéu - Primary Pitch Camera 1"
                className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sport Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as SportCategory)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Associate with Sports Event
                </label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">None (Independent Broadcast)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.competition}: {ev.homeTeam} vs {ev.awayTeam}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Detailed broadcast notes, camera position, production remarks..."
                className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Metadata Tags (Comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="1080p, football, semi-final"
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Public Watch Page Slug</label>
                <input
                  type="text"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value)}
                  placeholder="e.g. real-madrid-bayern"
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="publicWatchToggle"
                checked={isPublicWatch}
                onChange={(e) => setIsPublicWatch(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121D2F] border-[#1E2E4A] text-cyan-500 focus:ring-0"
              />
              <label htmlFor="publicWatchToggle" className="text-xs text-slate-300 cursor-pointer">
                Enable Public Watch Page (Provides responsive video player for public audiences without exposing stream keys)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Source Configuration & FFprobe */}
      {step === 2 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#19263D] pb-3 flex items-center gap-2">
            <Tv2 className="w-4 h-4 text-cyan-400" />
            Step 2: Source Configuration & Live Probe
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorized HLS / M3U8 Live Stream URL <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/live/sports_feed.m3u8"
                  className="flex-1 bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleProbeSource}
                  disabled={probing || !sourceUrl.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                >
                  {probing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{probing ? 'Probing...' : 'Probe Source'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-cyan-400" />
                Protected by SSRF security guard. Validates codecs, resolution, and audio channels using FFprobe.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Optional Authorization Header (Bearer token, API key)
              </label>
              <input
                type="text"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                placeholder="Bearer eyJhbGciOi..."
                className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Probe Result Card */}
            {probeResult && (
              <div className={`p-4 rounded-xl border ${
                probeResult.valid 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {probeResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className={`text-xs font-bold ${probeResult.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {probeResult.valid ? 'Stream Validated Successfully' : 'Probe Validation Failed'}
                  </span>
                </div>

                {probeResult.valid ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mt-3">
                    <div className="bg-[#0A101D] p-2.5 rounded-lg border border-[#19263D]">
                      <div className="text-[10px] text-slate-400 uppercase">Video Codec</div>
                      <div className="text-white font-bold">{probeResult.videoCodec?.toUpperCase()}</div>
                    </div>
                    <div className="bg-[#0A101D] p-2.5 rounded-lg border border-[#19263D]">
                      <div className="text-[10px] text-slate-400 uppercase">Resolution</div>
                      <div className="text-cyan-400 font-bold">{probeResult.width} x {probeResult.height}</div>
                    </div>
                    <div className="bg-[#0A101D] p-2.5 rounded-lg border border-[#19263D]">
                      <div className="text-[10px] text-slate-400 uppercase">Frame Rate</div>
                      <div className="text-white font-bold">{probeResult.fps || 60} FPS</div>
                    </div>
                    <div className="bg-[#0A101D] p-2.5 rounded-lg border border-[#19263D]">
                      <div className="text-[10px] text-slate-400 uppercase">Audio Track</div>
                      <div className="text-white font-bold">{probeResult.audioCodec?.toUpperCase()} ({probeResult.audioChannels || 2}ch)</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-300 font-mono mt-1">
                    {probeResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Destination Configuration */}
      {step === 3 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#19263D] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              Step 3: Target Broadcast Destination
            </h2>
            <Link
              href="/destinations"
              target="_blank"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              + Add New Destination
            </Link>
          </div>

          <div className="space-y-4">
            {destinations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No destinations configured. Please go to Destinations to add your YouTube Live stream key.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {destinations.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      destinationId === d.id
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                        : 'bg-[#121D2F] border-[#1E2E4A] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="destination"
                        checked={destinationId === d.id}
                        onChange={() => setDestinationId(d.id)}
                        className="w-4 h-4 text-cyan-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {d.name}
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                            {d.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{d.ingestUrl}</div>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Key: {d.maskedStreamKey}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Output Profile */}
      {step === 4 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#19263D] pb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Step 4: Output & Transcoding Profile
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTranscodeMode('COPY')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  transcodeMode === 'COPY'
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-[#121D2F] border-[#1E2E4A] hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Stream-Copy (Direct Passthrough)
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Zero re-encoding overhead. Preserves original resolution and bitstream. Recommended when source matches YouTube requirements.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTranscodeMode('TRANSCODE')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  transcodeMode === 'TRANSCODE'
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-[#121D2F] border-[#1E2E4A] hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Cloud Video Transcoder
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Re-encode with H.264/AAC at target bitrate, resolution, and keyframe interval for guaranteed compatibility.
                </p>
              </button>
            </div>

            {transcodeMode === 'TRANSCODE' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#19263D]">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Video Bitrate</label>
                  <select
                    value={videoBitrate}
                    onChange={(e) => setVideoBitrate(parseInt(e.target.value, 10))}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value={6000}>6000 kbps (1080p60 High)</option>
                    <option value={4500}>4500 kbps (1080p Standard)</option>
                    <option value={3000}>3000 kbps (720p60)</option>
                    <option value={2000}>2000 kbps (720p30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value, 10))}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value={60}>60 FPS (Sports smooth)</option>
                    <option value={30}>30 FPS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="source">Match Source</option>
                    <option value="1080p">1080p (1920x1080)</option>
                    <option value="720p">720p (1280x720)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: Scheduling */}
      {step === 5 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#19263D] pb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Step 5: Broadcast Scheduling & Auto-Stop
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="startType"
                  checked={startType === 'NOW'}
                  onChange={() => setStartType('NOW')}
                  className="w-4 h-4 text-cyan-500"
                />
                <span>Broadcast on Manual Command / Ready Standby</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="startType"
                  checked={startType === 'SCHEDULED'}
                  onChange={() => setStartType('SCHEDULED')}
                  className="w-4 h-4 text-cyan-500"
                />
                <span>Schedule Future Broadcast Time</span>
              </label>
            </div>

            {startType === 'SCHEDULED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#121D2F] border border-[#1E2E4A] rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#0E1726] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#0E1726] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="hasStopTime"
                  checked={hasStopTime}
                  onChange={(e) => setHasStopTime(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 rounded"
                />
                <label htmlFor="hasStopTime" className="text-xs text-slate-300 cursor-pointer">
                  Configure Automatic Stop Time (Workers terminate cleanly at conclusion)
                </label>
              </div>

              {hasStopTime && (
                <div className="w-full sm:w-1/2">
                  <input
                    type="datetime-local"
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Review and Launch */}
      {step === 6 && (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#19263D] pb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Step 6: Review & Final Confirmation
          </h2>

          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 bg-[#121D2F] p-4 rounded-xl border border-[#1E2E4A]">
              <div>
                <span className="text-slate-400">Stream Title:</span>
                <div className="text-white font-bold font-sans text-sm mt-0.5">{name || 'Untitled Stream'}</div>
              </div>
              <div>
                <span className="text-slate-400">Sport Category:</span>
                <div className="text-cyan-400 font-bold mt-0.5">{sport}</div>
              </div>
              <div>
                <span className="text-slate-400">Source:</span>
                <div className="text-slate-300 truncate mt-0.5">{sourceUrl}</div>
              </div>
              <div>
                <span className="text-slate-400">Destination:</span>
                <div className="text-slate-300 mt-0.5">
                  {destinations.find(d => d.id === destinationId)?.name || 'Default Destination'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Relay Mode:</span>
                <div className="text-slate-300 mt-0.5">{transcodeMode}</div>
              </div>
              <div>
                <span className="text-slate-400">Auto Stop:</span>
                <div className="text-slate-300 mt-0.5">{hasStopTime && stopTime ? stopTime : 'Manual Stop Only'}</div>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 p-3.5 rounded-lg text-cyan-300 text-xs font-sans">
              <strong>Persistence Guarantee:</strong> Once initiated, the relay runs as a dedicated FFmpeg cloud process. You may safely close this browser tab, log out, or shut down your personal device; the broadcast will continue until the stop time or user cancellation.
            </div>
          </div>
        </div>
      )}

      {/* Stepper Controls */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
        ) : <div />}

        {step < 6 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !name.trim()) {
                setError('Please provide a stream name');
                return;
              }
              if (step === 2 && !sourceUrl.trim()) {
                setError('Please provide a source URL');
                return;
              }
              setError(null);
              setStep(step + 1);
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
            >
              Save as Standby
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/25"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{saving ? 'Starting Relay...' : 'Save & Start Broadcast Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
