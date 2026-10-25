'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Tv2, 
  Radio, 
  Plus, 
  Calendar, 
  Trophy, 
  Share2, 
  BarChart3, 
  ScrollText, 
  Settings, 
  ShieldCheck, 
  X,
  Menu,
  Activity,
  Cpu
} from 'lucide-react';

const BOTTOM_ITEMS = [
  { href: '/', label: 'Overview', icon: Tv2 },
  { href: '/streams', label: 'Streams', icon: Radio },
  { href: '/streams/create', label: 'Go Live', icon: Plus, isAction: true },
  { href: '/events', label: 'Events', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const ALL_DRAWER_ITEMS = [
  { href: '/', label: 'Dashboard Overview', icon: Tv2 },
  { href: '/streams', label: 'Active Streams & Channels', icon: Radio },
  { href: '/streams/create', label: 'Create New Stream', icon: Plus, highlight: true },
  { href: '/schedule', label: 'Broadcast Scheduler', icon: Calendar },
  { href: '/events', label: 'Sports Event Lineups', icon: Trophy },
  { href: '/destinations', label: 'RTMP & YouTube Ingests', icon: Share2 },
  { href: '/analytics', label: 'Live Telemetry & Analytics', icon: BarChart3 },
  { href: '/logs', label: 'Studio & Worker Logs', icon: ScrollText },
  { href: '/settings', label: 'System & Engine Settings', icon: Settings },
  { href: '/account', label: 'Account & Security', icon: ShieldCheck },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Don't render on public watch page
  if (pathname.startsWith('/watch')) {
    return null;
  }

  return (
    <>
      {/* =========================================================================
          1. BOTTOM MOBILE NAVIGATION BAR (Sticky, 48px touch targets, high contrast)
          ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#080D1A]/95 backdrop-blur-lg border-t border-[#19263D] flex items-center justify-around px-2 md:hidden">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/streams/create');
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
                aria-label={item.label}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 border-2 border-[#080D1A] shadow-lg shadow-cyan-500/30 flex items-center justify-center text-white active:scale-95 transition-transform">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-cyan-400 mt-0.5 tracking-tight">Go Live</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[56px] ${
                isActive ? 'text-cyan-400' : 'text-slate-400 active:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold text-cyan-400' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Drawer Trigger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-slate-400 active:text-slate-200 transition-colors min-w-[56px]"
          aria-label="Open Full Studio Menu"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] mt-1 font-medium text-slate-400">Menu</span>
        </button>
      </nav>

      {/* =========================================================================
          2. SLIDE-OVER MOBILE DRAWER (Full navigation & cloud engine diagnostics)
          ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Pane */}
          <div className="relative w-4/5 max-w-xs bg-[#0A101D] border-r border-[#19263D] flex flex-col h-full z-10 text-slate-200 shadow-2xl">
            {/* Header */}
            <div className="h-16 px-4 border-b border-[#19263D] flex items-center justify-between bg-[#070C16]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">CLOUDCAST STUDIO</div>
                  <div className="text-[10px] text-cyan-400 uppercase font-mono">Mobile Operations</div>
                </div>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-[#0E1726] border border-[#19263D] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Studio Modules
              </div>
              {ALL_DRAWER_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                        : item.highlight
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-[#121B2B]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Cloud Worker Status Footnote */}
            <div className="p-3 border-t border-[#19263D] bg-[#070C16] text-[11px] text-slate-400">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  FFmpeg Cloud Relay
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  ONLINE
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Infinite Reconnect Watchdog Active
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
