'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, Plus, Server, Bell, User as UserIcon, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function Header() {
  const [liveCount, setLiveCount] = useState(0);
  const [workerOnline, setWorkerOnline] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await api.getStreams('LIVE');
      setLiveCount(res.streams?.length || 0);
      setWorkerOnline(true);
    } catch {
      setWorkerOnline(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0A101D] border-b border-[#19263D] px-6 flex items-center justify-between z-10 shrink-0">
      {/* Left: Studio Status Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726] border border-[#19263D]">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Studio Status:</span>
          {liveCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 pulse-onair"></span>
              {liveCount} STREAM{liveCount > 1 ? 'S' : ''} ON AIR
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              STANDBY / READY
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726] border border-[#19263D] text-xs text-slate-400">
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>Worker Engine:</span>
          <span className={`font-semibold ${workerOnline ? 'text-cyan-400' : 'text-rose-400'}`}>
            {workerOnline ? 'FFmpeg Connected' : 'Worker Offline'}
          </span>
        </div>
      </div>

      {/* Right: Actions and User Profile */}
      <div className="flex items-center gap-3">
        <button 
          onClick={fetchStatus} 
          title="Refresh Studio State"
          aria-label="Refresh Studio State"
          className="p-2 rounded-lg bg-[#0E1726] border border-[#19263D] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <Link
          href="/streams/create"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stream Relay</span>
        </Link>

        <div className="h-6 w-[1px] bg-[#19263D] mx-1"></div>

        <Link
          href="/account"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0E1726] border border-[#19263D] hover:border-cyan-500/40 text-xs text-slate-300 transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
            OP
          </div>
          <span className="hidden sm:inline font-medium">Studio Director</span>
        </Link>
      </div>
    </header>
  );
}
