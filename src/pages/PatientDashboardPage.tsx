import React, {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Monitor,
  Stethoscope,
  User,
} from 'lucide-react';
import {
  CLINICAL_EASE,
  EcgPulseLine,
  FloatingEmptyState,
  LivePulseIndicator,
  ProgressRing,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  estimateTravelMinutes,
  formatArrivalWindow,
  formatClockTime,
  formatDuration,
  getStatusMeta,
} from '../engine/queueEngine';

const STEPS = [
  {key: 'REGISTERED', label: 'Registered'},
  {key: 'WAITING', label: 'In Queue'},
  {key: 'CALLED', label: 'Called to Room'},
  {key: 'IN_CONSULTATION', label: 'Consultation'},
  {key: 'COMPLETED', label: 'Completed'},
] as const;

type PatientTab = 'queue' | 'records' | 'sms';

function getStepIndex(status: string): number {
  switch (status) {
    case 'WAITING':
      return 1;
    case 'CALLED':
      return 2;
    case 'IN_CONSULTATION':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

function getProgressPercent(status: string): number {
  switch (status) {
    case 'WAITING':
      return 42;
    case 'CALLED':
      return 74;
    case 'IN_CONSULTATION':
      return 90;
    case 'COMPLETED':
      return 100;
    case 'NO_SHOW':
      return 15;
    default:
      return 20;
  }
}

export const PatientDashboardPage: React.FC = () => {
  const {
    departments,
    tokens,
    smsLogs,
    selectedPatientTokenId,
    setView,
  } = useOpd();

  const [activeTab, setActiveTab] = useState<PatientTab>('queue');

  const token =
    tokens.find((t) => t.id === selectedPatientTokenId) ??
    tokens.find((t) => t.tokenNumber === 'CARD-104') ??
    tokens[0];

  if (!token) {
    return (
      <div className="clinical-canvas min-h-[60vh] flex items-center justify-center px-4">
        <FloatingEmptyState
          title="No OPD token selected"
          description="Look up your digital token number or mobile number to monitor live arrival windows and consultation records."
          actionLabel="Look up a Token"
          onAction={() => setView('track')}
        />
      </div>
    );
  }

  const dept =
    departments.find((d) => d.id === token.departmentId) ?? departments[0];
  const deptTokens = tokens.filter((t) => t.departmentId === dept.id);
  const currentServing =
    deptTokens.find((t) => t.status === 'IN_CONSULTATION') ??
    deptTokens.find((t) => t.status === 'CALLED');

  const statusMeta = getStatusMeta(token.status);
  const activeStep = getStepIndex(token.status);
  const progressPct = getProgressPercent(token.status);
  const travelMinutes = estimateTravelMinutes(token.distanceKm);
  const recommendedDepartureTs =
    token.arrivalWindowStart - travelMinutes * 60 * 1000;

  const personalSms = smsLogs.filter(
    (s) => s.tokenNumber === token.tokenNumber || s.phone === token.phone,
  );

  const isDisrupted =
    dept.isPaused ||
    dept.activeDelayMinutes > 0 ||
    dept.activeEmergencyMinutes > 0;

  const tabs: Array<{id: PatientTab; label: string; count?: number}> = [
    {id: 'queue', label: 'Live Queue & Arrival'},
    {id: 'records', label: 'Medical Record & Rx'},
    {id: 'sms', label: 'SMS Advisories', count: personalSms.length},
  ];

  return (
    <div className="clinical-canvas">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Top Back & Utility Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setView('track')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch Token</span>
          </button>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {dept.name} · {dept.roomNumber} ({dept.floor})
            </span>
            <button
              type="button"
              onClick={() => setView('public-board')}
              className="inline-flex items-center gap-1 font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Waiting Hall Board</span>
            </button>
          </div>
        </div>

        {/* Live Pause / Delay / Emergency Alert Banner */}
        {isDisrupted && token.status !== 'COMPLETED' && (
          <motion.div
            role="status"
            initial={{opacity: 0, y: -8}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.24, ease: CLINICAL_EASE}}
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              dept.activeEmergencyMinutes > 0
                ? 'bg-red-50 dark:bg-red-950/45 border-red-200 dark:border-red-900/70 text-red-900 dark:text-red-100'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                dept.activeEmergencyMinutes > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            />
            <div className="text-sm space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {dept.isPaused
                    ? `${dept.name} OPD Queue is Temporarily Paused`
                    : dept.activeEmergencyMinutes > 0
                      ? `Emergency Interruption in ${dept.name} (+${dept.activeEmergencyMinutes} min)`
                      : `Doctor Schedule Delay in ${dept.name} (+${dept.activeDelayMinutes} min)`}
                </p>
                <LivePulseIndicator
                  variant={dept.activeEmergencyMinutes > 0 ? 'urgent' : 'warning'}
                  label={dept.activeEmergencyMinutes > 0 ? 'Urgent Shift' : 'Adjusted'}
                />
              </div>
              <p className="text-xs opacity-90">
                {dept.isPaused
                  ? `${dept.pauseReason || 'Queue paused briefly by staff.'} Your arrival window below has been adjusted automatically.`
                  : `${dept.activeAdvisoryText}. Your recommended arrival window has been shifted automatically so you do not wait in the corridor.`}
              </p>
            </div>
          </motion.div>
        )}

        {/* Dominant Focal Anchor: Deep Medical Blue-Teal Digital OPD Pass */}
        <section className="clinical-card rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="hidden sm:block">
                <ProgressRing
                  progress={progressPct}
                  size={84}
                  strokeWidth={7}
                  label={`${progressPct}%`}
                  sublabel="stage"
                  trackClass="stroke-white/20"
                  indicatorClass="stroke-teal-300"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                  {token.status === 'IN_CONSULTATION' || token.status === 'CALLED' ? (
                    <LivePulseIndicator
                      variant={token.status === 'CALLED' ? 'warning' : 'online'}
                      label={statusMeta.label}
                    />
                  ) : (
                    <span className="font-semibold text-teal-200">
                      {statusMeta.label}
                    </span>
                  )}
                  <span className="text-sky-200/50">·</span>
                  <span className="text-sky-100">{dept.name}</span>
                  <span className="text-sky-200/50">·</span>
                  <span className="text-sky-100/90">
                    {dept.doctorName} ({dept.roomNumber})
                  </span>
                </div>
                <h1 className="font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight text-white">
                  {token.tokenNumber}
                </h1>
                <p className="text-sm text-sky-100">
                  <strong className="font-semibold text-white">
                    {token.patientName}
                  </strong>{' '}
                  ({token.age}y, {token.gender}) · {token.locality} (
                  {token.distanceKm} km) ·{' '}
                  <span className="font-mono text-xs">{token.phone}</span>
                </p>
              </div>
            </div>

            {/* Highlighted Arrival Window / Action Callout */}
            <div
              className={`lg:min-w-[300px] rounded-2xl border p-5 space-y-1.5 ${
                token.status === 'CALLED'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : token.status === 'IN_CONSULTATION'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : token.status === 'NO_SHOW'
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : 'bg-white/95 dark:bg-[#0B172A]/95 text-[#0B1E3D] dark:text-white border-white/25 shadow-lg shadow-sky-950/25'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {token.status === 'CALLED'
                    ? 'Immediate Action Required'
                    : token.status === 'IN_CONSULTATION'
                      ? 'Consultation Active'
                      : token.status === 'COMPLETED'
                        ? 'Visit Completed'
                        : token.status === 'NO_SHOW'
                          ? 'Marked Absent (No-Show)'
                          : 'Recommended Hospital Arrival Window'}
                </span>
              </div>

              {token.status === 'WAITING' && (
                <>
                  <p className="font-mono tabular-nums text-2xl font-bold text-[#0B1E3D] dark:text-white">
                    {formatArrivalWindow(
                      token.arrivalWindowStart,
                      token.arrivalWindowEnd,
                      token.estimatedWaitMinutes,
                    )}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Report directly to {dept.roomNumber} ({dept.floor})
                  </p>
                </>
              )}

              {token.status === 'CALLED' && (
                <>
                  <p className="text-xl font-bold text-amber-900">
                    Proceed to {dept.roomNumber} now
                  </p>
                  <p className="text-xs text-amber-800">
                    {dept.doctorName} has called your token.
                  </p>
                </>
              )}

              {token.status === 'IN_CONSULTATION' && (
                <>
                  <p className="text-xl font-bold text-emerald-900">
                    Inside {dept.roomNumber}
                  </p>
                  <p className="text-xs text-emerald-800">
                    Started at{' '}
                    <span className="font-mono tabular-nums">
                      {formatClockTime(token.startedAt ?? Date.now())}
                    </span>
                  </p>
                </>
              )}

              {token.status === 'COMPLETED' && (
                <>
                  <p className="text-xl font-bold text-[#0B1E3D] dark:text-white">
                    Consultation Concluded
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Completed at{' '}
                    <span className="font-mono tabular-nums">
                      {formatClockTime(token.completedAt ?? Date.now())}
                    </span>
                  </p>
                </>
              )}

              {token.status === 'NO_SHOW' && (
                <>
                  <p className="text-lg font-bold text-red-900">
                    Removed from Active Queue
                  </p>
                  <p className="text-xs text-red-800">
                    Please visit the OPD reception desk to request authorized
                    re-admission into the queue.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 4-Column Tabular Queue Telemetry Strip */}
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2ECF8] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
            <div className="p-5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Now Serving
              </dt>
              <dd className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-[#0F5CA8] dark:text-sky-400">
                {currentServing ? currentServing.tokenNumber : '—'}
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Your Queue Position
              </dt>
              <dd className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-[#0B1E3D] dark:text-white">
                {token.status === 'WAITING' && token.position
                  ? `#${token.position}`
                  : token.status === 'CALLED'
                    ? 'Next'
                    : token.status === 'IN_CONSULTATION'
                      ? 'In Room'
                      : '—'}
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Patients Ahead
              </dt>
              <dd className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-[#0B1E3D] dark:text-white">
                {token.status === 'WAITING' || token.status === 'CALLED'
                  ? token.patientsAhead
                  : 0}
              </dd>
            </div>
            <div className="p-5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Est. Consultation Time
              </dt>
              <dd className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-[#0B1E3D] dark:text-white">
                {token.status === 'COMPLETED'
                  ? 'Done'
                  : token.status === 'IN_CONSULTATION'
                    ? 'Now'
                    : token.status === 'NO_SHOW'
                      ? '—'
                      : formatClockTime(token.estimatedConsultTimestamp)}
              </dd>
              {token.status === 'WAITING' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                  Est. wait {formatDuration(token.estimatedWaitMinutes)}
                </p>
              )}
            </div>
          </dl>

          {/* Animated Visual Queue Progression Rail */}
          {token.status !== 'NO_SHOW' && (
            <div className="px-6 sm:px-8 py-5 bg-[#F8FBFF] dark:bg-[#0A1629] border-t border-[#E2ECF8] dark:border-[#1B3154]">
              <div className="grid grid-cols-5 gap-2.5">
                {STEPS.map((step, idx) => {
                  const isDone = idx < activeStep;
                  const isCurrent = idx === activeStep;
                  return (
                    <div key={step.key} className="space-y-2">
                      <div className="h-2 rounded-full bg-[#DCE7F5] dark:bg-[#162947] overflow-hidden">
                        <motion.div
                          initial={{scaleX: 0}}
                          animate={{scaleX: isDone || isCurrent ? 1 : 0}}
                          transition={{
                            duration: 0.42,
                            delay: idx * 0.06,
                            ease: CLINICAL_EASE,
                          }}
                          style={{transformOrigin: 'left'}}
                          className={`h-full rounded-full ${
                            isDone
                              ? 'bg-[#0D9488] dark:bg-teal-400'
                              : isCurrent
                                ? 'bg-[#0F5CA8] dark:bg-sky-400'
                                : 'bg-transparent'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-xs truncate ${
                          isCurrent
                            ? 'font-bold text-[#0B1E3D] dark:text-white'
                            : isDone
                              ? 'font-semibold text-[#0D9488] dark:text-teal-400'
                              : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Smooth Tabbed Patient Portal Navigation */}
        <div
          role="tablist"
          aria-label="Patient portal sections"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E7F0FC] dark:bg-[#0E1C33] border border-[#DCE7F5] dark:border-[#1B3154] overflow-x-auto max-w-full"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-[#0B1E3D] dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1E3D] dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="patient-portal-tab"
                    transition={{type: 'spring', stiffness: 460, damping: 35}}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#173056] shadow-sm"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                      ({tab.count})
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tabbed Content Panels */}
        <AnimatePresence mode="wait">
          {activeTab === 'queue' && (
            <motion.div
              key="tab-queue"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -6}}
              transition={{duration: 0.2, ease: CLINICAL_EASE}}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Travel Guidance Card */}
              <section className="clinical-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0B1E3D] dark:text-white">
                  <MapPin className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
                  <h2>
                    Travel Guidance · {token.locality} ({token.distanceKm} km)
                  </h2>
                </div>
                {token.status === 'WAITING' ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Estimated road travel time is{' '}
                    <strong className="font-mono tabular-nums text-[#0B1E3D] dark:text-white">
                      {formatDuration(travelMinutes)}
                    </strong>
                    .{' '}
                    {recommendedDepartureTs > Date.now() ? (
                      <>
                        Plan to depart around{' '}
                        <strong className="font-mono tabular-nums text-[#0F5CA8] dark:text-sky-400">
                          {formatClockTime(recommendedDepartureTs)}
                        </strong>{' '}
                        to reach {dept.roomNumber} smoothly inside your arrival
                        bracket.
                      </>
                    ) : (
                      <>
                        Please begin travelling towards District Civil Hospital now
                        to arrive on time for {dept.roomNumber}.
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Registered from {token.locality} ({token.distanceKm} km). Current
                    visit stage: <strong>{statusMeta.label}</strong>.
                  </p>
                )}
              </section>

              {/* Clinic & Consulting Doctor Card */}
              <section className="clinical-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0B1E3D] dark:text-white">
                    <Stethoscope className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                    <h2>Assigned Clinic Details</h2>
                  </div>
                  <LivePulseIndicator
                    variant={
                      dept.isPaused
                        ? 'warning'
                        : dept.activeEmergencyMinutes > 0
                          ? 'urgent'
                          : 'online'
                    }
                    label={dept.isPaused ? 'Paused' : 'Clinic Live'}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Doctor</dt>
                    <dd className="font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                      {dept.doctorName}
                    </dd>
                    <dd className="text-slate-500 dark:text-slate-400">
                      {dept.doctorQualification}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Room &amp; Floor
                    </dt>
                    <dd className="font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                      {dept.roomNumber}
                    </dd>
                    <dd className="text-slate-500 dark:text-slate-400">
                      {dept.floor} · {dept.opdHours}
                    </dd>
                  </div>
                </dl>
                <EcgPulseLine className="w-full h-7 pt-1" />
              </section>
            </motion.div>
          )}

          {activeTab === 'records' && (
            <motion.div
              key="tab-records"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -6}}
              transition={{duration: 0.2, ease: CLINICAL_EASE}}
              className="space-y-6"
            >
              {/* Patient Demographics Summary */}
              <section className="clinical-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E2ECF8] dark:border-[#1B3154] pb-3">
                  <User className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                  <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    Patient Profile &amp; Visit Intake
                  </h2>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Full Name
                    </dt>
                    <dd className="font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                      {token.patientName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Age / Gender
                    </dt>
                    <dd className="font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                      {token.age} yrs · {token.gender}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Registered At
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                      {formatClockTime(token.registeredAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Chief Complaint
                    </dt>
                    <dd className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {token.visitReason || 'General OPD Consultation'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Clinical Diagnosis & Prescription */}
              <section className="clinical-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0A1629] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
                  <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                    OPD Consultation Summary &amp; Prescription
                  </h2>
                </div>

                {token.status === 'COMPLETED' ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm bg-white dark:bg-[#0E1C33]">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Clinical Diagnosis</span>
                      </p>
                      <p className="text-[#0B1E3D] dark:text-white leading-relaxed">
                        {token.diagnosis || 'Clinical consultation completed.'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#0F5CA8] dark:text-sky-400" />
                        <span>Prescription &amp; Follow-Up Advice</span>
                      </p>
                      <p className="text-[#0B1E3D] dark:text-white leading-relaxed">
                        {token.prescription ||
                          'Collect prescribed medicines from Hospital Pharmacy.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0E1C33]">
                    <FloatingEmptyState
                      title="Consultation notes not recorded yet"
                      description={`Once ${dept.doctorName} concludes your OPD consultation, your verified diagnosis and pharmacy prescription will appear right here automatically.`}
                    />
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'sms' && (
            <motion.div
              key="tab-sms"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -6}}
              transition={{duration: 0.2, ease: CLINICAL_EASE}}
            >
              <section className="clinical-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0A1629] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                    <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                      SMS Advisories Sent to {token.phone}
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {personalSms.length} messages
                  </span>
                </div>

                {personalSms.length === 0 ? (
                  <div className="bg-white dark:bg-[#0E1C33]">
                    <FloatingEmptyState
                      title="No SMS advisories yet"
                      description="Automated SMS updates for token confirmation, schedule adjustments, and room calls will appear here."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                    {personalSms.map((sms) => (
                      <div
                        key={sms.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl">
                          {sms.message}
                        </p>
                        <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                          {formatClockTime(sms.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
