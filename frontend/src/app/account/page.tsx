'use client';

import { useState } from 'react';
import { ShieldCheck, User as UserIcon, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setStatusMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">Account & Production Security</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage operator authentication, API session keys, and review platform defense parameters.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Operator Identity Card */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <UserIcon className="w-4 h-4 text-cyan-400" />
          Operator Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Email Address</span>
            <div className="text-white font-bold mt-0.5">admin@cloudcast.studio</div>
          </div>

          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Assigned Role</span>
            <div className="text-cyan-400 font-bold mt-0.5">System Director (ADMIN)</div>
          </div>

          <div className="bg-[#121D2F] border border-[#1E2E4A] p-3 rounded-lg">
            <span className="text-slate-500 uppercase text-[10px]">Access Permission</span>
            <div className="text-emerald-400 font-bold mt-0.5">Full Studio Control</div>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          Update Operator Password
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (Min 8 characters)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#121D2F] border border-[#1E2E4A] rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Security Architecture Audit */}
      <div className="bg-[#0E1726] border border-[#19263D] rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#19263D] pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Active Security Defenses
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">AES-256-GCM Envelope Encryption:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Stream keys are encrypted with unique IVs and authenticated tags. Never logged or leaked to browser.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">SSRF DNS Guard & Private IP Blocking:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Blocks 127.0.0.1, 10.x, 192.168.x, 169.254.169.254, and internal hostnames.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Zero-Shell Process Spawning:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">FFmpeg and FFprobe are spawned directly using parameter arrays without shell interpolation.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#121D2F] border border-[#1E2E4A]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Telemetry & Log Redaction:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Automatically strips RTMP keys, passwords, and bearer tokens from logs and telemetry.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
