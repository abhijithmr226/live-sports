'use client';

import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  HelpCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Radio, 
  Cpu, 
  Layers, 
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">Studio System Settings & Deployment Guide</h1>
        <p className="text-xs text-slate-400 mt-1">
          Cloud worker process settings, YouTube Live configuration walkthrough, and production deployment checklists.
        </p>
      </div>

      {/* Cloud Worker Engine Parameters */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Streaming Engine Node Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Worker Node Identity</span>
            <div className="text-white font-bold mt-0.5">cloudcast-worker-primary-01</div>
          </div>

          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">FFmpeg Binary Engine</span>
            <div className="text-emerald-400 font-bold mt-0.5">FFmpeg 9.0.2 Full Build (x86_64)</div>
          </div>

          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Max Concurrent Relays</span>
            <div className="text-cyan-400 font-bold mt-0.5">4 Active Stream Instances</div>
          </div>

          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Credential Cryptography</span>
            <div className="text-emerald-400 font-bold mt-0.5">AES-256-GCM Hardware Authenticated</div>
          </div>
        </div>
      </div>

      {/* YouTube Live Configuration Walkthrough (Section 19 requirement) */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <Radio className="w-4 h-4 text-rose-500" />
          YouTube Live Studio Setup Walkthrough
        </h2>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <strong className="text-white font-semibold">Enable Live Streaming on YouTube:</strong>
              <p className="text-slate-400 mt-0.5">
                Ensure live streaming is enabled on your YouTube Channel. If this is your first broadcast, YouTube requires phone verification and a 24-hour activation window.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <strong className="text-white font-semibold">Create a Broadcast in YouTube Live Studio:</strong>
              <p className="text-slate-400 mt-0.5">
                Go to <span className="text-cyan-400 font-mono">studio.youtube.com</span> &gt; Create &gt; Go Live &gt; Stream tab. Select &quot;Streaming software&quot;. Set privacy to <strong>Unlisted</strong> first for pre-match testing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <strong className="text-white font-semibold">Copy Stream URL and Stream Key:</strong>
              <p className="text-slate-400 mt-0.5">
                YouTube provides the default Stream URL (<span className="text-cyan-400 font-mono">rtmp://a.rtmp.youtube.com/live2</span>) and a unique Stream Key. Add this in CloudCast under <strong>Destinations</strong>. CloudCast encrypts the key immediately.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <strong className="text-white font-semibold">Verify Live Transmission & Health:</strong>
              <p className="text-slate-400 mt-0.5">
                Click &quot;Go Live&quot; in CloudCast. Within 5–10 seconds, YouTube Live Studio will display &quot;Excellent Connection&quot; with live video and audio preview. Enable auto-start in YouTube Studio or click &quot;Go Live&quot; in YouTube when ready for your audience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Free-Tier Deployment Reality & Limitations (Section 19 requirement) */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Cloud Hosting Architecture & Free-Tier Limitations
        </h2>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            • <strong>Frontend Hosting:</strong> The Next.js frontend dashboard can be hosted completely free on Vercel, Netlify, or Cloudflare Pages.
          </p>
          <p>
            • <strong>Backend API & Database:</strong> The Node.js API and PostgreSQL database can run on free tiers of services like Supabase, Neon, or Render.
          </p>
          <p>
            • <strong>FFmpeg Video Processing Worker:</strong> Continuous sports live streaming requires sustained outbound bandwidth and long-running processes (2+ hours continuously). Serverless functions (like Vercel or AWS Lambda) will timeout after 15–60 seconds and cannot run persistent broadcasts.
          </p>
          <p className="text-slate-400">
            For production 24/7 or multi-match streaming, deploy the worker to an always-on VPS with unmetered or high bandwidth (e.g. Hetzner, DigitalOcean, or an on-premise Windows/Linux machine running FFmpeg).
          </p>
        </div>
      </div>
    </div>
  );
}
