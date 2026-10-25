'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Tv2, 
  Radio, 
  PlusCircle, 
  Calendar, 
  Trophy, 
  Share2, 
  BarChart3, 
  ScrollText, 
  Settings, 
  ShieldCheck, 
  Activity,
  Cpu
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: Tv2 },
  { href: '/streams', label: 'Streams', icon: Radio },
  { href: '/streams/create', label: 'Create Stream', icon: PlusCircle, highlight: true },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/events', label: 'Sports Events', icon: Trophy },
  { href: '/destinations', label: 'Destinations', icon: Share2 },
  { href: '/analytics', label: 'Stream Analytics', icon: BarChart3 },
  { href: '/logs', label: 'Activity Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/account', label: 'Account & Security', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  // If on public watch page, don't show internal sidebar
  if (pathname.startsWith('/watch')) {
    return null;
  }

  return (
    <aside className="hidden md:flex w-64 bg-[#0A101D] border-r border-[#19263D] flex-col shrink-0 min-h-screen text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#19263D] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
              CLOUDCAST
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.2 rounded font-mono">LIVE</span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Sports Studio</div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Broadcast Controls
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/streams/create');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : item.highlight
                  ? 'bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121B2B]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span className="flex-1">{item.label}</span>
              {item.highlight && (
                <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  New
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Cloud Worker Status Widget */}
      <div className="p-3 border-t border-[#19263D] bg-[#070C16]">
        <div className="bg-[#0E1726] border border-[#19263D] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Cloud Worker
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Relay Capacity</span>
              <span className="font-mono text-slate-300">4 / 4 Available</span>
            </div>
            <div className="w-full bg-[#162235] h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[25%] rounded-full"></div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#19263D]/60 font-mono">
            <span>FFmpeg 9.0.2</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Persistent
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
