'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Download, Shield, Filter, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { StreamLog, AuditLog } from '@cloudcast/shared';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<'STREAM' | 'AUDIT'>('STREAM');
  const [streamLogs, setStreamLogs] = useState<StreamLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'STREAM') {
        const res = await api.getLogs(severityFilter === 'ALL' ? undefined : severityFilter);
        setStreamLogs(res.logs || []);
      } else {
        const res = await api.getAuditLogs();
        setAuditLogs(res.auditLogs || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab, severityFilter]);

  const handleDownload = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('cloudcast_token') : null;
    window.open(`${API_BASE}/logs/download${token ? `?token=${token}` : ''}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Production Activity & Audit Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time FFmpeg process telemetry, connection state events, and administrative security audit trails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-[#0E1726] border border-[#1E2E4A] text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#142033] hover:bg-[#1A2A42] border border-[#1E2E4A] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download Sanitized Log File</span>
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1726] border border-[#19263D] p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('STREAM')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'STREAM'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#142033]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Stream Broadcast Events</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'AUDIT'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#142033]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>User Audit Trail</span>
          </button>
        </div>

        {activeTab === 'STREAM' && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  severityFilter === s
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log Feed */}
      <div className="bg-[#0A101D] border border-[#19263D] rounded-xl overflow-hidden shadow-inner font-mono text-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">
            Loading logs from disk database...
          </div>
        ) : activeTab === 'STREAM' ? (
          streamLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No stream event logs matching criteria.
            </div>
          ) : (
            <div className="divide-y divide-[#162235] p-2">
              {streamLogs.map((log) => (
                <div key={log.id} className="p-2.5 hover:bg-[#0E1726] rounded flex flex-col sm:flex-row sm:items-start gap-3 transition-colors">
                  <span className="text-slate-500 shrink-0 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                    log.severity === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.severity === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                    log.severity === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {log.eventType}
                  </span>

                  <div className="flex-1 text-slate-300 break-all text-[11px] leading-relaxed">
                    {log.message}
                  </div>

                  <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                    Stream: {log.streamId.slice(0, 12)}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No audit trail records found.
            </div>
          ) : (
            <div className="divide-y divide-[#162235] p-2">
              {auditLogs.map((al) => (
                <div key={al.id} className="p-2.5 hover:bg-[#0E1726] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[11px]">
                      {new Date(al.timestamp).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase">
                      {al.action}
                    </span>
                    <span className="text-slate-300 text-xs font-sans">
                      Resource: <strong className="font-mono text-cyan-400">{al.resourceType} ({al.resourceId})</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    User: {al.userEmail || al.userId}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
