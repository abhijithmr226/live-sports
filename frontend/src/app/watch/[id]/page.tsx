'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { Radio, Trophy, Clock, Share2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PublicWatchData } from '@cloudcast/shared';

function WatchContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PublicWatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicWatchData(id)
      .then((res) => setData(res.watchData))
      .catch((err) => setError(err.message || 'Stream broadcast not available'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isLive = data?.status === 'LIVE' || data?.status === 'STARTING';

  return (
    <div className="min-h-screen bg-[#060A13] text-slate-100 flex flex-col justify-between -m-6 p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Public Header */}
        <div className="flex items-center justify-between border-b border-[#162235] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-wide">CLOUDCAST</span>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest ml-1 font-semibold">LIVE ARENA</span>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1726] border border-[#1E2E4A] hover:border-cyan-500/40 text-xs text-slate-300 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Share Stream'}</span>
          </button>
        </div>

        {error ? (
          <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-12 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-sm font-bold text-white">Broadcast Unavailable</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This match feed is either private, ended, or has not been scheduled yet.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-[#0A101D] border border-[#19263D] rounded-xl aspect-video flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Connecting to authorized public live feed...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live Sports Match Scoreboard Banner */}
            {data?.homeTeam && data?.awayTeam && (
              <div className="bg-gradient-to-r from-[#0C1524] via-[#101D33] to-[#0C1524] border border-[#1E2E4A] rounded-xl p-4 flex items-center justify-between">
                <div className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                  {data.competition || data.sport}
                </div>

                <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-3">
                  <span>{data.homeTeam}</span>
                  <span className="text-slate-500 text-xs font-normal">vs</span>
                  <span>{data.awayTeam}</span>
                </div>

                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isLive ? 'bg-red-500 text-white pulse-onair' : 'bg-slate-700 text-slate-300'
                }`}>
                  {isLive ? 'LIVE' : 'UPCOMING'}
                </span>
              </div>
            )}

            {/* Video Player Frame */}
            <div className="bg-[#0A101D] border border-[#19263D] rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-2xl">
              {isLive ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#070B14]">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center pulse-onair">
                    <Radio className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-bold text-white tracking-wide">
                    OFFICIAL BROADCAST FEED ACTIVE
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {data?.title} is now broadcasting live. If viewing on YouTube Live, switch to the official YouTube player embed.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto text-slate-600" />
                  <div className="text-sm font-semibold text-slate-300">Broadcast Starts Soon</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Scheduled start: {data?.startTime ? new Date(data.startTime).toLocaleString() : 'Standby'}
                  </p>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isLive ? 'bg-red-600 text-white pulse-onair' : 'bg-black/60 text-slate-400 border border-slate-700'
                }`}>
                  {isLive ? 'LIVE' : 'PRE-MATCH'}
                </span>
              </div>
            </div>

            {/* Event Description Card */}
            <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-5 space-y-2">
              <h1 className="text-base font-bold text-white">{data?.title}</h1>
              {data?.description && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {data.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-600 py-6 border-t border-[#162235]/60 mt-12">
        Powered by CloudCast Sports Studio • High Performance Cloud Video Relays
      </footer>
    </div>
  );
}

export default function PublicWatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading broadcast channel...</div>}>
      <WatchContent params={params} />
    </Suspense>
  );
}
