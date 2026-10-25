'use client';

import { useState, useEffect } from 'react';
import { 
  Share2, 
  Plus, 
  ShieldCheck, 
  CheckCircle2, 
  Trash2, 
  ExternalLink, 
  Radio, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Destination, DestinationType } from '@cloudcast/shared';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState<DestinationType>('YOUTUBE');
  const [ingestUrl, setIngestUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const res = await api.getDestinations();
      setDestinations(res.destinations || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleTypeChange = (newType: DestinationType) => {
    setType(newType);
    if (newType === 'YOUTUBE') {
      setIngestUrl('rtmp://a.rtmp.youtube.com/live2');
    } else if (newType === 'CUSTOM_RTMPS') {
      setIngestUrl('rtmps://');
    } else {
      setIngestUrl('rtmp://');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createDestination({
        name: name.trim(),
        type,
        ingestUrl: ingestUrl.trim(),
        streamKey: streamKey.trim(),
        isDefault
      });
      setIsModalOpen(false);
      setName('');
      setStreamKey('');
      fetchDestinations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create destination');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestMessage(null);
    try {
      const res = await api.testDestination(id);
      setTestMessage(res.message);
    } catch (err: unknown) {
      setTestMessage(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Broadcast Destinations & Stream Keys</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure RTMP/RTMPS ingest endpoints for YouTube Live or custom CDN receivers. Keys are encrypted with AES-256-GCM.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Destination</span>
        </button>
      </div>

      {testMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testMessage}</span>
        </div>
      )}

      {/* Destinations List */}
      {loading ? (
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center text-slate-400 text-xs animate-pulse">
          Loading destinations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {destinations.map((d) => (
            <div
              key={d.id}
              className="bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-[#142033] border border-[#1E2E4A] flex items-center justify-center text-cyan-400">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {d.name}
                        {d.isDefault && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                            Default
                          </span>
                        )}
                      </h3>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono uppercase mt-0.5 inline-block">
                        {d.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-[#121D2F] p-3 rounded-lg border border-[#1E2E4A]">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Ingest Endpoint</span>
                    <span className="text-slate-300 break-all">{d.ingestUrl}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#19263D] flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase">Encrypted Key</span>
                      <span className="text-emerald-400">{d.maskedStreamKey}</span>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#19263D] pt-3">
                <button
                  onClick={() => handleTest(d.id)}
                  disabled={testingId === d.id}
                  className="px-3 py-1.5 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-xs font-semibold text-slate-200 transition-colors"
                >
                  {testingId === d.id ? 'Validating...' : 'Test Ingest'}
                </button>

                <button
                  onClick={async () => {
                    if (confirm(`Remove destination "${d.name}"?`)) {
                      try {
                        await api.deleteDestination(d.id);
                        fetchDestinations();
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed to delete');
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Destination"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Destination Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              Configure Target Destination
            </h2>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Live Primary Control Room"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Type</label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as DestinationType)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="YOUTUBE">YouTube Live (RTMPS / RTMP)</option>
                  <option value="CUSTOM_RTMP">Custom RTMP</option>
                  <option value="CUSTOM_RTMPS">Custom Secure RTMPS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ingest URL *</label>
                <input
                  type="text"
                  required
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Private Stream Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Paste YouTube Live stream key"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Key is encrypted with AES-256-GCM. It will never be returned back to the browser.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultDest"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 rounded"
                />
                <label htmlFor="defaultDest" className="text-xs text-slate-300 cursor-pointer">
                  Set as default destination for new streams
                </label>
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
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
