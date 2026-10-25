'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { WorkerHealth } from '@cloudcast/shared';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      setData(res);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('cloudcast_token') : null;
    window.open(`${API_BASE}/analytics/export-csv${token ? `?token=${token}` : ''}`, '_blank');
  };

  const summary = data?.summary || {};
  const worker: WorkerHealth | undefined = data?.worker;
  const recentJobs: any[] = data?.recentJobs || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Stream Telemetry & Broadcast Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical relay duration, reconnection reliability metrics, hardware utilization, and audit telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Metrics KPI Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Total Relay Jobs</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {summary.jobs?.totalJobs || 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{summary.jobs?.successfulJobs || 0} completed successfully</span>
          </div>
        </div>

        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Total Airtime Duration</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {Math.round((summary.jobs?.totalBroadcastSeconds || 0) / 60)} <span className="text-sm font-normal text-slate-400">mins</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />
            <span>{summary.jobs?.totalBroadcastSeconds || 0} seconds elapsed</span>
          </div>
        </div>

        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Auto-Reconnections</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {summary.jobs?.totalReconnections || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Exponential backoff recovery</span>
          </div>
        </div>

        <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Worker System Load</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {worker?.system?.cpuLoadPercent ?? 12}% <span className="text-sm font-normal text-slate-400">CPU</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
            <Cpu className="w-3 h-3" />
            <span>{worker?.activeJobsCount || 0} / {worker?.maxJobsCapacity || 4} capacity active</span>
          </div>
        </div>
      </div>

      {/* Historical Jobs Table */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#19263D] flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Recent Broadcast Relay Executions
          </h2>
          <span className="text-xs font-mono text-slate-400">{recentJobs.length} records</span>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No broadcast job records in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#121D2F] text-slate-400 uppercase text-[10px] border-b border-[#19263D]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Job ID</th>
                  <th className="px-4 py-3 font-semibold">Stream Channel</th>
                  <th className="px-4 py-3 font-semibold">Sport</th>
                  <th className="px-4 py-3 font-semibold">Execution State</th>
                  <th className="px-4 py-3 font-semibold">Started At</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Reconnects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#19263D]/60 text-slate-300">
                {recentJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#121D2F]/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-cyan-400">{j.id}</td>
                    <td className="px-4 py-3 font-sans font-medium text-white">{j.streamName}</td>
                    <td className="px-4 py-3 text-indigo-300">{j.sport}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        j.state === 'RUNNING' ? 'bg-red-500 text-white' :
                        j.state === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                        j.state === 'FAILED' ? 'bg-rose-500/15 text-rose-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {j.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {j.startedAt ? new Date(j.startedAt).toLocaleString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {j.currentUptimeSeconds ? `${j.currentUptimeSeconds}s` : '--'}
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-bold">{j.reconnectCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
