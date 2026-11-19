import React, {useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {Search, Send, X} from 'lucide-react';
import {
  AnimatedModal,
  FloatingEmptyState,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {formatClockTime} from '../engine/queueEngine';
import {SmsCategory} from '../types/opd';

const CATEGORY_META: Record<SmsCategory, {label: string; className: string}> = {
  TOKEN_CONFIRMED: {
    label: 'Token Confirmed',
    className: 'text-[#0F5CA8] dark:text-sky-400 font-semibold',
  },
  YOUR_TURN: {
    label: 'Your Turn',
    className: 'text-emerald-700 dark:text-emerald-400 font-semibold',
  },
  DELAY_NOTICE: {
    label: 'Delay Notice',
    className: 'text-amber-700 dark:text-amber-400 font-semibold',
  },
  EMERGENCY_ALERT: {
    label: 'Emergency Alert',
    className: 'text-red-700 dark:text-red-400 font-semibold',
  },
  QUEUE_STATUS: {
    label: 'Queue Status',
    className: 'text-slate-700 dark:text-slate-300 font-medium',
  },
  REQUEUED: {
    label: 'Requeued',
    className: 'text-[#0D9488] dark:text-teal-400 font-medium',
  },
  BROADCAST: {
    label: 'Manual Broadcast',
    className: 'text-[#0B1E3D] dark:text-white font-semibold',
  },
};

export const StaffSmsLogPage: React.FC = () => {
  const {departments, tokens, smsLogs, activeStaffDeptId, sendManualBroadcast} =
    useOpd();

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SmsCategory>('ALL');
  const [scopeDeptOnly, setScopeDeptOnly] = useState(true);
  const [search, setSearch] = useState('');

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');

  const dept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];

  const waitingCount = tokens.filter(
    (t) =>
      t.departmentId === dept.id &&
      (t.status === 'WAITING' || t.status === 'CALLED'),
  ).length;

  const filteredLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      if (scopeDeptOnly && log.departmentId !== dept.id) return false;
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        log.recipientName.toLowerCase().includes(q) ||
        log.phone.toLowerCase().includes(q) ||
        (log.tokenNumber && log.tokenNumber.toLowerCase().includes(q)) ||
        log.message.toLowerCase().includes(q)
      );
    });
  }, [smsLogs, scopeDeptOnly, dept.id, categoryFilter, search]);

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    sendManualBroadcast(dept.id, broadcastText);
    setBroadcastText('');
    setBroadcastOpen(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mobile, token, text..."
                className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] pl-9 pr-3 py-2 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as 'ALL' | SmsCategory)
              }
              aria-label="Filter SMS by event type"
              className="rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] px-3 py-2 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
            >
              <option value="ALL">All SMS Categories</option>
              <option value="TOKEN_CONFIRMED">Token Confirmed</option>
              <option value="YOUR_TURN">Your Turn</option>
              <option value="DELAY_NOTICE">Delay Notice</option>
              <option value="EMERGENCY_ALERT">Emergency Alert</option>
              <option value="QUEUE_STATUS">Queue Status</option>
              <option value="REQUEUED">Requeued</option>
              <option value="BROADCAST">Manual Broadcast</option>
            </select>

            <div className="inline-flex items-center gap-1 p-1 bg-[#E7F0FC] dark:bg-[#0E1C33] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl">
              <button
                type="button"
                onClick={() => setScopeDeptOnly(true)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                  scopeDeptOnly
                    ? 'text-[#0B1E3D] dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1E3D] dark:hover:text-white'
                }`}
              >
                {scopeDeptOnly && (
                  <motion.span
                    layoutId="sms-scope-tab"
                    transition={{type: 'spring', stiffness: 460, damping: 35}}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#173056] shadow-sm"
                  />
                )}
                <span className="relative z-10">{dept.name}</span>
              </button>
              <button
                type="button"
                onClick={() => setScopeDeptOnly(false)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                  !scopeDeptOnly
                    ? 'text-[#0B1E3D] dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1E3D] dark:hover:text-white'
                }`}
              >
                {!scopeDeptOnly && (
                  <motion.span
                    layoutId="sms-scope-tab"
                    transition={{type: 'spring', stiffness: 460, damping: 35}}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#173056] shadow-sm"
                  />
                )}
                <span className="relative z-10">All Departments</span>
              </button>
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{y: -1.5}}
            whileTap={{scale: 0.97}}
            disabled={waitingCount === 0}
            onClick={() => setBroadcastOpen(true)}
            className="cta-warm-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Send Broadcast SMS</span>
          </motion.button>
        </div>

        {/* SMS Audit Ledger Table */}
        <div className="clinical-card rounded-2xl overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="bg-white dark:bg-[#0E1C33]">
              <FloatingEmptyState
                title="No SMS dispatches match your filters"
                description="Book a token, call a patient, or log a schedule update to see live SMS gateway dispatches appear here."
                actionLabel="Show All Messages"
                onAction={() => {
                  setCategoryFilter('ALL');
                  setScopeDeptOnly(false);
                  setSearch('');
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2ECF8] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0A1629] text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Message Body</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                  {filteredLogs.map((log) => {
                    const meta = CATEGORY_META[log.category];
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors"
                      >
                        <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
                          {formatClockTime(log.timestamp)}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-medium text-[#0B1E3D] dark:text-white">
                            {log.recipientName}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {log.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 whitespace-nowrap align-top">
                          {log.tokenNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap align-top">
                          <span className={meta.className}>{meta.label}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-md align-top">
                          {log.message}
                        </td>
                        <td className="py-3.5 px-5 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap align-top">
                          Dispatched
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Animated Manual Broadcast Modal */}
      <AnimatedModal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleBroadcastSubmit}>
          <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                Broadcast SMS · {dept.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Will be dispatched to {waitingCount} waiting patients
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBroadcastOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="broadcast-msg"
                className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
              >
                Announcement Message
              </label>
              <textarea
                id="broadcast-msg"
                rows={3}
                required
                placeholder="e.g. Please keep your previous ECG report ready before entering Room 104."
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBroadcastOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cta-warm-btn px-5 py-2 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Send to {waitingCount} Patients
              </button>
            </div>
          </div>
        </form>
      </AnimatedModal>
    </>
  );
};
