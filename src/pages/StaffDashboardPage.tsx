import React, {useState} from 'react';
import {motion} from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  PhoneCall,
  Play,
  UserX,
  X,
} from 'lucide-react';
import {
  AnimatedModal,
  AnimatedNumber,
  CLINICAL_EASE,
  FloatingEmptyState,
  LivePulseIndicator,
  ProgressRing,
  StaggerContainer,
  StaggerItem,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  formatArrivalWindow,
  formatClockTime,
  formatDuration,
} from '../engine/queueEngine';
import {QueueToken} from '../types/opd';

export const StaffDashboardPage: React.FC = () => {
  const {
    departments,
    tokens,
    events,
    smsLogs,
    activeStaffDeptId,
    setView,
    callNextPatient,
    startConsultation,
    completeConsultation,
    markNoShow,
  } = useOpd();

  const [completingToken, setCompletingToken] = useState<QueueToken | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');

  const dept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];
  const deptTokens = tokens.filter((t) => t.departmentId === dept.id);

  const inConsult = deptTokens.find((t) => t.status === 'IN_CONSULTATION');
  const called = deptTokens.find((t) => t.status === 'CALLED');
  const waiting = deptTokens
    .filter((t) => t.status === 'WAITING')
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  const completedCount = deptTokens.filter((t) => t.status === 'COMPLETED').length;
  const noShowCount = deptTokens.filter((t) => t.status === 'NO_SHOW').length;
  const totalOffset = dept.activeDelayMinutes + dept.activeEmergencyMinutes;
  const completionPct = deptTokens.length
    ? Math.round((completedCount / deptTokens.length) * 100)
    : 0;

  const deptEvents = events
    .filter((e) => e.departmentId === dept.id)
    .slice(0, 6);
  const deptSmsCount = smsLogs.filter((s) => s.departmentId === dept.id).length;

  const deptBreakdown = departments.map((d) => {
    const dt = tokens.filter((t) => t.departmentId === d.id);
    return {
      dept: d,
      waiting: dt.filter((t) => t.status === 'WAITING' || t.status === 'CALLED').length,
      completed: dt.filter((t) => t.status === 'COMPLETED').length,
      total: dt.length,
    };
  });
  const maxDeptTotal = Math.max(4, ...deptBreakdown.map((b) => b.total));

  const handleOpenComplete = (tok: QueueToken) => {
    setCompletingToken(tok);
    setDiagnosis('');
    setPrescription('');
  };

  const handleSubmitComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingToken) return;
    completeConsultation(completingToken.id, diagnosis, prescription);
    setCompletingToken(null);
  };

  return (
    <>
      <div className="space-y-7">
        {/* 4-Column KPI Strip with Animated Count-Up Numbers */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 clinical-card rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-[#E2ECF8] dark:divide-[#1B3154] overflow-hidden">
          <StaggerItem className="p-5">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Tokens Today
            </dt>
            <dd className="mt-2 text-3xl font-bold text-[#0B1E3D] dark:text-white">
              <AnimatedNumber value={deptTokens.length} />
            </dd>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Next issue: {dept.code}-{dept.nextSequence}
            </p>
          </StaggerItem>
          <StaggerItem className="p-5">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Waiting in Queue
            </dt>
            <dd className="mt-2 text-3xl font-bold text-[#0F5CA8] dark:text-sky-400">
              <AnimatedNumber value={waiting.length + (called ? 1 : 0)} />
            </dd>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {called ? `1 called (${called.tokenNumber})` : 'Ready to call next'}
            </p>
          </StaggerItem>
          <StaggerItem className="p-5">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed Consults
            </dt>
            <dd className="mt-2 text-3xl font-bold text-[#0D9488] dark:text-teal-400">
              <AnimatedNumber value={completedCount} />
            </dd>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {noShowCount} marked no-show
            </p>
          </StaggerItem>
          <StaggerItem className="p-5">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Schedule Offset
            </dt>
            <dd
              className={`mt-2 text-3xl font-bold ${
                totalOffset > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <AnimatedNumber
                value={totalOffset}
                prefix={totalOffset > 0 ? '+' : ''}
                suffix="m"
              />
            </dd>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {deptSmsCount} SMS alerts sent
            </p>
          </StaggerItem>
        </StaggerContainer>

        {/* Active Consultation Room + Right Operational Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Active Consultation Room Card */}
            <section className="clinical-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Active Consultation Room ({dept.roomNumber})
                  </h2>
                  <p className="text-xs text-sky-100/90 mt-0.5">
                    Manage the patient inside the cabin or call the next token
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{y: -1.5}}
                  whileTap={{scale: 0.97}}
                  disabled={waiting.length === 0 || dept.isPaused}
                  onClick={() => callNextPatient(dept.id)}
                  className="cta-warm-btn inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Next Waiting</span>
                </motion.button>
              </div>

              <div className="divide-y divide-[#E2ECF8] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                {/* Inside Room Row */}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    {inConsult ? (
                      <LivePulseIndicator variant="online" label="In Consultation" />
                    ) : (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Room Idle
                      </p>
                    )}
                  </div>
                  {inConsult ? (
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-mono tabular-nums text-2xl font-bold text-[#0B1E3D] dark:text-white">
                            {inConsult.tokenNumber}
                          </span>
                          <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            {inConsult.patientName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {inConsult.age}y, {inConsult.gender} · {inConsult.locality}{' '}
                          · Started {formatClockTime(inConsult.startedAt ?? Date.now())}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Note: {inConsult.visitReason}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{y: -1}}
                        whileTap={{scale: 0.97}}
                        onClick={() => handleOpenComplete(inConsult)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Consultation</span>
                      </motion.button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Consultation room is currently free. Call or start the next
                      patient below.
                    </p>
                  )}
                </div>

                {/* Called to Room Row */}
                {called && (
                  <div className="p-6 bg-amber-50/60 dark:bg-amber-950/30">
                    <LivePulseIndicator
                      variant="warning"
                      label="Called to Door · Awaiting Entry"
                    />
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-mono tabular-nums text-xl font-bold text-[#0B1E3D] dark:text-white">
                            {called.tokenNumber}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {called.patientName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {called.phone} · {called.locality} ({called.distanceKm} km)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button
                          type="button"
                          whileTap={{scale: 0.97}}
                          onClick={() => startConsultation(called.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-xl cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Consultation</span>
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => markNoShow(called.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 bg-white dark:bg-[#0A1629] border border-red-200 dark:border-red-900/60 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer whitespace-nowrap"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>No-Show</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Up Next Preview */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Next Waiting Patients ({waiting.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setView('staff-queue')}
                      className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Open full queue →
                    </button>
                  </div>

                  {waiting.length === 0 ? (
                    <FloatingEmptyState
                      title="Waiting queue is empty"
                      description={`All registered patients for ${dept.name} have been called or completed.`}
                    />
                  ) : (
                    <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl overflow-hidden">
                      {waiting.slice(0, 4).map((tok) => (
                        <div
                          key={tok.id}
                          className="px-4 py-3 flex items-center justify-between gap-4 text-sm bg-white dark:bg-[#0A1629]"
                        >
                          <div className="min-w-0">
                            <span className="font-mono tabular-nums font-bold text-[#0F5CA8] dark:text-sky-400">
                              #{tok.position} {tok.tokenNumber}
                            </span>
                            <span className="mx-2 text-slate-300 dark:text-slate-600">
                              ·
                            </span>
                            <span className="font-medium text-[#0B1E3D] dark:text-white">
                              {tok.patientName}
                            </span>
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              ({tok.locality}, {tok.distanceKm} km)
                            </span>
                          </div>
                          <div className="text-right shrink-0 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                            {formatArrivalWindow(
                              tok.arrivalWindowStart,
                              tok.arrivalWindowEnd,
                              tok.estimatedWaitMinutes,
                            )}{' '}
                            <span className="text-slate-400 dark:text-slate-500">
                              ({formatDuration(tok.estimatedWaitMinutes)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Animated Clinic Throughput Chart + Completion Ring */}
            <section className="clinical-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                    Hospital OPD Throughput Summary
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live waiting vs. completed volume across clinics
                  </p>
                </div>
                <ProgressRing
                  progress={completionPct}
                  size={68}
                  strokeWidth={6}
                  label={`${completionPct}%`}
                  sublabel={dept.code}
                  indicatorClass="stroke-[#0D9488] dark:stroke-teal-400"
                />
              </div>

              <div className="space-y-3">
                {deptBreakdown.map(({dept: d, waiting: w, completed: c, total}) => (
                  <div key={d.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold ${
                          d.id === dept.id
                            ? 'text-[#0F5CA8] dark:text-sky-400'
                            : 'text-[#0B1E3D] dark:text-slate-200'
                        }`}
                      >
                        {d.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {c} done · {w} waiting
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#E2ECF8] dark:bg-[#162947] overflow-hidden flex">
                      <motion.div
                        initial={{scaleX: 0}}
                        animate={{scaleX: c > 0 ? 1 : 0}}
                        transition={{duration: 0.55, ease: CLINICAL_EASE}}
                        style={{
                          transformOrigin: 'left',
                          width: `${(c / maxDeptTotal) * 100}%`,
                        }}
                        className="h-full bg-[#0D9488] dark:bg-teal-400"
                      />
                      <motion.div
                        initial={{scaleX: 0}}
                        animate={{scaleX: w > 0 ? 1 : 0}}
                        transition={{duration: 0.55, delay: 0.08, ease: CLINICAL_EASE}}
                        style={{
                          transformOrigin: 'left',
                          width: `${(w / maxDeptTotal) * 100}%`,
                        }}
                        className="h-full bg-[#0F5CA8] dark:bg-sky-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Quick Operational Modules + Event Audit */}
          <div className="lg:col-span-5 space-y-6">
            <section className="clinical-card rounded-2xl divide-y divide-[#E9F0FA] dark:divide-[#1B3154] overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8FBFF] dark:bg-[#0A1629] border-b border-[#E2ECF8] dark:border-[#1B3154]">
                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Quick Operational Modules
                </h2>
              </div>
              <motion.button
                type="button"
                whileHover={{x: 3}}
                transition={{duration: 0.14, ease: CLINICAL_EASE}}
                onClick={() => setView('staff-queue')}
                className="w-full px-5 py-4 flex items-center justify-between text-left bg-white dark:bg-[#0E1C33] hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                      Queue Operations Table
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Call, start, complete, mark no-show, or requeue patients
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{x: 3}}
                transition={{duration: 0.14, ease: CLINICAL_EASE}}
                onClick={() => setView('staff-delays')}
                className="w-full px-5 py-4 flex items-center justify-between text-left bg-white dark:bg-[#0E1C33] hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                      Log Doctor Delay / Emergency
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Shift arrival windows &amp; dispatch automatic SMS alerts
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{x: 3}}
                transition={{duration: 0.14, ease: CLINICAL_EASE}}
                onClick={() => setView('staff-sms')}
                className="w-full px-5 py-4 flex items-center justify-between text-left bg-white dark:bg-[#0E1C33] hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                      SMS Dispatch Audit Log
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inspect sent advisories or broadcast custom notices
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </motion.button>
            </section>

            {/* Recent Events Feed */}
            <section className="clinical-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8FBFF] dark:bg-[#0A1629] border-b border-[#E2ECF8] dark:border-[#1B3154]">
                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Recent Queue Events · {dept.name}
                </h2>
              </div>
              {deptEvents.length === 0 ? (
                <div className="bg-white dark:bg-[#0E1C33]">
                  <FloatingEmptyState
                    title="No operational events yet"
                    description="Actions taken on this clinic queue will be logged here in real time."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                  {deptEvents.map((evt) => (
                    <div key={evt.id} className="px-5 py-3.5 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-[#0B1E3D] dark:text-white">
                          {evt.title}
                        </p>
                        <span className="font-mono tabular-nums text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          {formatClockTime(evt.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {evt.details}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Animated Complete Consultation Modal */}
      <AnimatedModal
        open={Boolean(completingToken)}
        onClose={() => setCompletingToken(null)}
      >
        {completingToken && (
          <form onSubmit={handleSubmitComplete}>
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
                  htmlFor="dash-diag"
                  className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                >
                  Clinical Diagnosis
                </label>
                <input
                  id="dash-diag"
                  type="text"
                  required
                  placeholder="e.g. Controlled hypertension, normal sinus rhythm"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
                />
              </div>
              <div>
                <label
                  htmlFor="dash-rx"
                  className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                >
                  Prescription &amp; Follow-up Advice
                </label>
                <textarea
                  id="dash-rx"
                  rows={3}
                  required
                  placeholder="e.g. Continue Tab. Amlodipine 5mg OD, repeat ECG after 1 month"
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
                  Save &amp; Complete
                </button>
              </div>
            </div>
          </form>
        )}
      </AnimatedModal>
    </>
  );
};
