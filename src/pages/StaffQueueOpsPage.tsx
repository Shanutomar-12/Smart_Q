import React, {useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  Play,
  RotateCw,
  Search,
  UserX,
  X,
} from 'lucide-react';
import {
  AnimatedModal,
  FloatingEmptyState,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  formatArrivalWindow,
  formatClockTime,
  getStatusMeta,
} from '../engine/queueEngine';
import {QueueToken} from '../types/opd';

type StatusFilter = 'ALL' | 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'NO_SHOW';

export const StaffQueueOpsPage: React.FC = () => {
  const {
    departments,
    tokens,
    activeStaffDeptId,
    callNextPatient,
    callSpecificPatient,
    startConsultation,
    completeConsultation,
    markNoShow,
    requeuePatient,
    setSelectedPatientTokenId,
    setView,
  } = useOpd();

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const [completingToken, setCompletingToken] = useState<QueueToken | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');

  const [requeueToken, setRequeueToken] = useState<QueueToken | null>(null);
  const [targetPosition, setTargetPosition] = useState<number>(1);
  const [requeueReason, setRequeueReason] = useState(
    'Delayed in transit from village — authorized late re-admission',
  );

  const dept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];

  const deptTokens = useMemo(
    () => tokens.filter((t) => t.departmentId === dept.id),
    [tokens, dept.id],
  );

  const waitingCount = deptTokens.filter((t) => t.status === 'WAITING').length;

  const filteredTokens = useMemo(() => {
    const priority: Record<QueueToken['status'], number> = {
      IN_CONSULTATION: 0,
      CALLED: 1,
      WAITING: 2,
      NO_SHOW: 3,
      COMPLETED: 4,
    };

    return deptTokens
      .filter((t) => {
        if (filter === 'ACTIVE') {
          return (
            t.status === 'IN_CONSULTATION' ||
            t.status === 'CALLED' ||
            t.status === 'WAITING'
          );
        }
        if (filter === 'WAITING') return t.status === 'WAITING';
        if (filter === 'COMPLETED') return t.status === 'COMPLETED';
        if (filter === 'NO_SHOW') return t.status === 'NO_SHOW';
        return true;
      })
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          t.tokenNumber.toLowerCase().includes(q) ||
          t.patientName.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          t.locality.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (priority[a.status] !== priority[b.status]) {
          return priority[a.status] - priority[b.status];
        }
        if (a.status === 'WAITING' && b.status === 'WAITING') {
          return (a.position ?? 99) - (b.position ?? 99);
        }
        return b.registeredAt - a.registeredAt;
      });
  }, [deptTokens, filter, search]);

  const openCompleteModal = (tok: QueueToken) => {
    setCompletingToken(tok);
    setDiagnosis('');
    setPrescription('');
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingToken) return;
    completeConsultation(completingToken.id, diagnosis, prescription);
    setCompletingToken(null);
  };

  const openRequeueModal = (tok: QueueToken) => {
    setRequeueToken(tok);
    setTargetPosition(1);
    setRequeueReason(
      'Delayed in transit from village — authorized late re-admission',
    );
  };

  const handleRequeueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requeueToken) return;
    requeuePatient(requeueToken.id, targetPosition, requeueReason);
    setRequeueToken(null);
  };

  const inspectPatientPortal = (tok: QueueToken) => {
    setSelectedPatientTokenId(tok.id);
    setView('patient-dashboard');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar: Search + Sliding Filter Rail + Warm Call Next CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token, name, mobile..."
                className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] pl-9 pr-3 py-2 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-[#E7F0FC] dark:bg-[#0E1C33] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl self-start overflow-x-auto max-w-full">
              {(
                [
                  {id: 'ALL', label: 'All'},
                  {id: 'ACTIVE', label: 'Active'},
                  {id: 'WAITING', label: 'Waiting'},
                  {id: 'COMPLETED', label: 'Completed'},
                  {id: 'NO_SHOW', label: 'No-Show'},
                ] as const
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'text-[#0B1E3D] dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1E3D] dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="queue-filter-tab"
                        transition={{type: 'spring', stiffness: 460, damping: 35}}
                        className="absolute inset-0 rounded-lg bg-white dark:bg-[#173056] shadow-sm"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{y: -1.5}}
            whileTap={{scale: 0.97}}
            disabled={waitingCount === 0 || dept.isPaused}
            onClick={() => callNextPatient(dept.id)}
            className="cta-warm-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Next Waiting Patient</span>
          </motion.button>
        </div>

        {/* High-Density Queue Ledger Table */}
        <div className="clinical-card rounded-2xl overflow-hidden">
          {filteredTokens.length === 0 ? (
            <div className="bg-white dark:bg-[#0E1C33]">
              <FloatingEmptyState
                title="No tokens match this filter"
                description={`Clear the search query or switch status tabs to inspect all tokens in ${dept.name}.`}
                actionLabel="Reset Filters"
                onAction={() => {
                  setFilter('ALL');
                  setSearch('');
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2ECF8] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0A1629] text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-5">Token</th>
                    <th className="py-3 px-4">Patient &amp; Locality</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Rank</th>
                    <th className="py-3 px-4 text-right">Est. Consult</th>
                    <th className="py-3 px-4">Arrival Window</th>
                    <th className="py-3 px-5 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                  {filteredTokens.map((tok) => {
                    const statusMeta = getStatusMeta(tok.status);
                    return (
                      <motion.tr
                        key={tok.id}
                        layout
                        className={`hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors ${
                          tok.status === 'IN_CONSULTATION'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                            : tok.status === 'CALLED'
                              ? 'bg-amber-50/50 dark:bg-amber-950/20'
                              : ''
                        }`}
                      >
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => inspectPatientPortal(tok)}
                            title="Inspect patient live dashboard"
                            className="inline-flex items-center gap-1.5 font-mono tabular-nums font-bold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            <span>{tok.tokenNumber}</span>
                            <ExternalLink className="w-3 h-3 text-sky-400" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0B1E3D] dark:text-white">
                            {tok.patientName}{' '}
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                              ({tok.age}y, {tok.gender.charAt(0)})
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {tok.phone} · {tok.locality} ({tok.distanceKm} km)
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-xs ${statusMeta.textClass}`}>
                            {statusMeta.label}
                          </span>
                          {tok.requeueCount > 0 && (
                            <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              · Requeued
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tok.status === 'WAITING' && tok.position
                            ? `#${tok.position}`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#0B1E3D] dark:text-white whitespace-nowrap">
                          {tok.status === 'COMPLETED'
                            ? formatClockTime(tok.completedAt ?? tok.registeredAt)
                            : tok.status === 'NO_SHOW'
                              ? '—'
                              : tok.status === 'IN_CONSULTATION'
                                ? 'Now'
                                : formatClockTime(tok.estimatedConsultTimestamp)}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tok.status === 'WAITING'
                            ? formatArrivalWindow(
                                tok.arrivalWindowStart,
                                tok.arrivalWindowEnd,
                                tok.estimatedWaitMinutes,
                              )
                            : tok.status === 'CALLED'
                              ? 'At room door'
                              : tok.status === 'COMPLETED'
                                ? 'Done'
                                : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {tok.status === 'WAITING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={dept.isPaused}
                                  onClick={() => callSpecificPatient(tok.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F5CA8] dark:text-sky-300 bg-[#EFF6FF] dark:bg-sky-950/60 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/60 disabled:opacity-50 cursor-pointer"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Call</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markNoShow(tok.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>No-Show</span>
                                </button>
                              </>
                            )}

                            {tok.status === 'CALLED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startConsultation(tok.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-lg cursor-pointer"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Start Consultation</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markNoShow(tok.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>No-Show</span>
                                </button>
                              </>
                            )}

                            {tok.status === 'IN_CONSULTATION' && (
                              <button
                                type="button"
                                onClick={() => openCompleteModal(tok)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Complete Consultation</span>
                              </button>
                            )}

                            {tok.status === 'NO_SHOW' && (
                              <button
                                type="button"
                                onClick={() => openRequeueModal(tok)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F5CA8] dark:text-sky-300 bg-white dark:bg-[#0A1629] border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-sky-950/60 cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                <span>Re-admit &amp; Requeue</span>
                              </button>
                            )}

                            {tok.status === 'COMPLETED' && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                Recorded
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Animated Complete Consultation Modal */}
      <AnimatedModal
        open={Boolean(completingToken)}
        onClose={() => setCompletingToken(null)}
      >
        {completingToken && (
          <form onSubmit={handleCompleteSubmit}>
            <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                  Complete Consultation · {completingToken.tokenNumber}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {completingToken.patientName} ({completingToken.age}y,{' '}
                  {completingToken.gender})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompletingToken(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="ops-diag"
                  className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                >
                  Diagnosis
                </label>
                <input
                  id="ops-diag"
                  type="text"
                  required
                  placeholder="Enter clinical diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
                />
              </div>
              <div>
                <label
                  htmlFor="ops-rx"
                  className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                >
                  Prescription &amp; Follow-up Notes
                </label>
                <textarea
                  id="ops-rx"
                  rows={3}
                  required
                  placeholder="Enter prescribed medicines and follow-up interval"
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingToken(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer"
                >
                  Complete Visit
                </button>
              </div>
            </div>
          </form>
        )}
      </AnimatedModal>

      {/* Animated Re-admit & Requeue Modal */}
      <AnimatedModal
        open={Boolean(requeueToken)}
        onClose={() => setRequeueToken(null)}
        maxWidthClass="max-w-md"
      >
        {requeueToken && (
          <form onSubmit={handleRequeueSubmit}>
            <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                  Re-admit &amp; Requeue · {requeueToken.tokenNumber}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {requeueToken.patientName} ({requeueToken.locality})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequeueToken(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-2">
                  Target Queue Position
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, waitingCount + 1].map((pos, idx) => {
                    const label = idx === 3 ? `End (#${pos})` : `#${pos}`;
                    return (
                      <button
                        key={`${pos}-${idx}`}
                        type="button"
                        onClick={() => setTargetPosition(pos)}
                        className={`py-2 px-2 text-xs font-mono font-semibold rounded-xl border cursor-pointer transition-colors ${
                          targetPosition === pos
                            ? 'bg-[#0F5CA8] text-white border-[#0F5CA8]'
                            : 'bg-white dark:bg-[#0A1629] text-slate-700 dark:text-slate-200 border-[#CBD9EE] dark:border-[#1B3154] hover:bg-[#EFF6FF] dark:hover:bg-[#132544]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="requeue-reason"
                  className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                >
                  Authorization Reason
                </label>
                <input
                  id="requeue-reason"
                  type="text"
                  required
                  value={requeueReason}
                  onChange={(e) => setRequeueReason(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequeueToken(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-xl cursor-pointer"
                >
                  Confirm Requeue &amp; Notify
                </button>
              </div>
            </div>
          </form>
        )}
      </AnimatedModal>
    </>
  );
};
