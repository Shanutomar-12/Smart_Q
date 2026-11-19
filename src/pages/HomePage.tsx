import React, {useMemo, useRef, useState} from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import {
  ArrowRight,
  Clock,
  MapPin,
  Monitor,
  Search,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import {
  AnimatedNumber,
  CLINICAL_EASE,
  EcgPulseLine,
  LivePulseIndicator,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  formatArrivalWindow,
  formatDuration,
  previewNewTokenEstimate,
} from '../engine/queueEngine';

type ClinicFilter = 'ALL' | 'ONLINE' | string;

export const HomePage: React.FC = () => {
  const {
    departments,
    tokens,
    smsLogs,
    setView,
    setSelectedPatientTokenId,
    setPreselectedDeptId,
    currentStaff,
  } = useOpd();

  const [clinicFilter, setClinicFilter] = useState<ClinicFilter>('ALL');
  const heroRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const {scrollYProgress} = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 28]);

  const totalWaiting = tokens.filter(
    (t) => t.status === 'WAITING' || t.status === 'CALLED',
  ).length;
  const totalCompleted = tokens.filter((t) => t.status === 'COMPLETED').length;
  const totalInConsult = tokens.filter((t) => t.status === 'IN_CONSULTATION').length;

  const openSampleToken = (tokenNumber: string) => {
    const found = tokens.find((t) => t.tokenNumber === tokenNumber);
    if (found) {
      setSelectedPatientTokenId(found.id);
      setView('patient-dashboard');
    }
  };

  const bookForDepartment = (deptId: string) => {
    setPreselectedDeptId(deptId);
    setView('register');
  };

  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptTokens = tokens.filter((t) => t.departmentId === dept.id);
      const waiting = deptTokens.filter(
        (t) => t.status === 'WAITING' || t.status === 'CALLED',
      ).length;
      const completed = deptTokens.filter((t) => t.status === 'COMPLETED').length;
      const inConsult = deptTokens.find((t) => t.status === 'IN_CONSULTATION');
      const called = deptTokens.find((t) => t.status === 'CALLED');
      const forecast = previewNewTokenEstimate(dept, tokens);
      const isOnline = !dept.isPaused && dept.activeEmergencyMinutes === 0;
      return {
        dept,
        waiting,
        completed,
        inConsult,
        called,
        current: inConsult ?? called,
        forecast,
        isOnline,
        delayTotal: dept.activeDelayMinutes + dept.activeEmergencyMinutes,
      };
    });
  }, [departments, tokens]);

  const maxLoad = Math.max(
    4,
    ...departmentStats.map((s) => s.waiting + s.completed + (s.inConsult ? 1 : 0)),
  );

  const filteredDoctors = useMemo(() => {
    if (clinicFilter === 'ALL') return departmentStats;
    if (clinicFilter === 'ONLINE') return departmentStats.filter((d) => d.isOnline);
    return departmentStats.filter((d) => d.dept.id === clinicFilter);
  }, [departmentStats, clinicFilter]);

  return (
    <div className="clinical-canvas relative overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
        {/* Hero Split — Calming Parallax Glow + ECG Pulse + Live Department Snapshot */}
        <section
          ref={heroRef}
          className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch"
        >
          {/* Subtle Parallax Ambient Glow */}
          <motion.div
            aria-hidden="true"
            style={prefersReduced ? undefined : {y: heroParallaxY}}
            className="pointer-events-none absolute -top-12 -left-16 w-80 h-80 rounded-full bg-sky-400/15 dark:bg-sky-500/10 blur-3xl"
          />

          <motion.div
            initial={{opacity: 0, y: 14}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.36, ease: CLINICAL_EASE}}
            className="relative z-10 lg:col-span-6 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 tracking-wide">
                  District Civil Hospital · SmartOPD Portal
                </p>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <LivePulseIndicator variant="online" label="Live Queue Sync" />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#0B1E3D] dark:text-white leading-[1.12]">
                Book your OPD token from home and arrive right on time.
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                SmartOPD replaces early-morning corridor waits with personalized
                arrival windows. Whenever a consultation completes or an emergency
                arises, every waiting token recalculates automatically with SMS
                updates.
              </p>

              {/* Subtle Animated Healthcare ECG Pulse Line */}
              <div className="max-w-xs pt-1">
                <EcgPulseLine className="w-full h-9" />
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  whileHover={{y: -2}}
                  whileTap={{scale: 0.97}}
                  transition={{duration: 0.14}}
                  onClick={() => {
                    setPreselectedDeptId(null);
                    setView('register');
                  }}
                  className="cta-warm-btn inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Book OPD Token</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{y: -2}}
                  whileTap={{scale: 0.97}}
                  transition={{duration: 0.14}}
                  onClick={() => setView('track')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#0B1E3D] dark:text-slate-100 bg-white dark:bg-[#0E1C33] border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#132544] hover:border-sky-300 dark:hover:border-sky-700 transition-colors duration-150 cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                  <span>Track Existing Token</span>
                </motion.button>
              </div>

              <div className="pt-4 border-t border-[#DCE7F5] dark:border-[#1B3154] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                <span>Quick test pass:</span>
                <button
                  type="button"
                  onClick={() => openSampleToken('CARD-104')}
                  className="font-mono font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
                >
                  CARD-104 (Geeta Devi · Rampur)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setView('public-board')}
                  className="font-medium text-slate-700 dark:text-slate-300 hover:text-[#0F5CA8] dark:hover:text-sky-400 hover:underline cursor-pointer"
                >
                  Open Waiting Hall Board
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Panel: Live OPD Department Status Card */}
          <motion.div
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.4, delay: 0.06, ease: CLINICAL_EASE}}
            className="relative z-10 lg:col-span-6 clinical-card rounded-2xl flex flex-col justify-between overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Live OPD Department Status
                </h2>
                <p className="text-xs text-sky-100/90 mt-0.5">
                  Real-time consultation pace and next hospital arrival window
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('public-board')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-100 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Full Board</span>
              </button>
            </div>

            <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] flex-1 bg-white dark:bg-[#0E1C33]">
              {departmentStats.map(
                ({dept, current, waiting, forecast, delayTotal}) => (
                  <motion.div
                    key={dept.id}
                    whileHover={{x: 4}}
                    transition={{duration: 0.15, ease: CLINICAL_EASE}}
                    onClick={() => bookForDepartment(dept.id)}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0B1E3D] dark:text-white truncate">
                          {dept.name}
                        </span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {dept.roomNumber}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{dept.doctorName}</span>
                        <span aria-hidden="true">·</span>
                        {dept.isPaused ? (
                          <LivePulseIndicator variant="warning" label="Queue Paused" />
                        ) : dept.activeEmergencyMinutes > 0 ? (
                          <LivePulseIndicator
                            variant="urgent"
                            label={`Emergency +${dept.activeEmergencyMinutes}m`}
                          />
                        ) : delayTotal > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">
                            Delayed +{delayTotal}m
                          </span>
                        ) : (
                          <LivePulseIndicator variant="online" label="Doctor online" />
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums text-sm font-bold text-[#0F5CA8] dark:text-sky-400">
                        {current ? current.tokenNumber : 'Open'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {waiting} waiting · ~{formatDuration(forecast.estimatedWaitMinutes)}
                      </div>
                    </div>
                  </motion.div>
                ),
              )}
            </div>

            <div className="px-6 py-3.5 bg-[#F4F8FC] dark:bg-[#0A1629] border-t border-[#DCE7F5] dark:border-[#1B3154] flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Next Cardiology window:{' '}
                <strong className="font-mono tabular-nums text-[#0B1E3D] dark:text-white">
                  {(() => {
                    const card = departments[0];
                    const f = previewNewTokenEstimate(card, tokens);
                    return formatArrivalWindow(
                      f.arrivalWindowStart,
                      f.arrivalWindowEnd,
                      f.estimatedWaitMinutes,
                    );
                  })()}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => bookForDepartment(departments[0].id)}
                className="inline-flex items-center gap-1 font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                <span>Book now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* 4-Column Operational KPI Strip with Animated Count-Up Numbers */}
        <StaggerContainer
          delay={0.06}
          className="grid grid-cols-2 lg:grid-cols-4 clinical-card rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-[#E2ECF8] dark:divide-[#1B3154] overflow-hidden"
        >
          <StaggerItem className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active OPD Clinics
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#0B1E3D] dark:text-white">
              <AnimatedNumber value={departments.length} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {totalInConsult} consultations in progress
            </p>
          </StaggerItem>
          <StaggerItem className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Patients in Queue
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#0F5CA8] dark:text-sky-400">
              <AnimatedNumber value={totalWaiting} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tracked with dynamic arrival windows
            </p>
          </StaggerItem>
          <StaggerItem className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed Today
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#0D9488] dark:text-teal-400">
              <AnimatedNumber value={totalCompleted} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              With digital diagnosis &amp; Rx records
            </p>
          </StaggerItem>
          <StaggerItem className="p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              SMS Alerts Dispatched
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#0B1E3D] dark:text-white">
              <AnimatedNumber value={smsLogs.length} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Confirmations, delays &amp; turn notices
            </p>
          </StaggerItem>
        </StaggerContainer>

        {/* Live OPD Clinic Load Visualization (Animated Draw-In Bars) */}
        <ScrollReveal>
          <section className="clinical-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-400">
                  Real-Time Capacity Telemetry
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                  Live Queue Load by OPD Department
                </h2>
              </div>
              <div className="flex items-center gap-5 text-xs text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0F5CA8] dark:bg-sky-400" />
                  Waiting / Called
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488] dark:bg-teal-400" />
                  Completed Today
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departmentStats.map(({dept, waiting, completed, forecast}) => {
                const waitingPct = Math.round((waiting / maxLoad) * 100);
                const completedPct = Math.round((completed / maxLoad) * 100);

                return (
                  <div
                    key={dept.id}
                    className="p-4 rounded-xl bg-[#F8FBFF] dark:bg-[#0A1629] border border-[#E2ECF8] dark:border-[#1B3154] space-y-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <span className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                          {dept.name}
                        </span>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          {dept.roomNumber}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                        ~{formatDuration(forecast.estimatedWaitMinutes)} wait
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-xs text-slate-500 dark:text-slate-400">
                          Waiting
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-[#DCE7F5] dark:bg-[#162947] overflow-hidden">
                          <motion.div
                            initial={{scaleX: 0}}
                            whileInView={{scaleX: Math.max(waitingPct / 100, waiting > 0 ? 0.08 : 0)}}
                            viewport={{once: true}}
                            transition={{duration: 0.65, ease: CLINICAL_EASE}}
                            style={{transformOrigin: 'left'}}
                            className="h-full rounded-full bg-gradient-to-r from-[#0F5CA8] to-sky-400"
                          />
                        </div>
                        <span className="w-6 text-right font-mono tabular-nums text-xs font-semibold text-[#0B1E3D] dark:text-white">
                          {waiting}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="w-20 text-xs text-slate-500 dark:text-slate-400">
                          Completed
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-[#DCE7F5] dark:bg-[#162947] overflow-hidden">
                          <motion.div
                            initial={{scaleX: 0}}
                            whileInView={{scaleX: Math.max(completedPct / 100, completed > 0 ? 0.08 : 0)}}
                            viewport={{once: true}}
                            transition={{duration: 0.65, delay: 0.08, ease: CLINICAL_EASE}}
                            style={{transformOrigin: 'left'}}
                            className="h-full rounded-full bg-gradient-to-r from-[#0D9488] to-emerald-400"
                          />
                        </div>
                        <span className="w-6 text-right font-mono tabular-nums text-xs font-semibold text-[#0B1E3D] dark:text-white">
                          {completed}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* Filterable Consulting Doctors & OPD Clinics Directory */}
        <ScrollReveal>
          <section className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                  On-Duty Specialists · Today&apos;s OPD Roster
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                  Consulting Doctors &amp; OPD Clinics
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Filter specialists by live availability or specialty and reserve a
                  token directly into their clinic queue.
                </p>
              </div>

              {/* Animated Segmented Filter Bar */}
              <div
                role="tablist"
                aria-label="Filter consulting doctors"
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E7F0FC] dark:bg-[#0E1C33] border border-[#DCE7F5] dark:border-[#1B3154] overflow-x-auto max-w-full"
              >
                {[
                  {id: 'ALL', label: 'All Clinics'},
                  {id: 'ONLINE', label: 'Doctor Online'},
                  ...departments.map((d) => ({id: d.id, label: d.name})),
                ].map((tab) => {
                  const active = clinicFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setClinicFilter(tab.id)}
                      className={`relative px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'text-[#0B1E3D] dark:text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1E3D] dark:hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="doctor-filter-tab"
                          transition={{type: 'spring', stiffness: 460, damping: 34}}
                          className="absolute inset-0 rounded-lg bg-white dark:bg-[#173056] shadow-sm"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filteredDoctors.map(
                  ({dept, waiting, forecast, delayTotal}) => (
                    <motion.article
                      layout
                      key={dept.id}
                      initial={{opacity: 0, scale: 0.97, y: 8}}
                      animate={{opacity: 1, scale: 1, y: 0}}
                      exit={{opacity: 0, scale: 0.96, y: -6}}
                      whileHover={{y: -3, scale: 1.012}}
                      transition={{duration: 0.22, ease: CLINICAL_EASE}}
                      className="clinical-card rounded-2xl p-6 flex flex-col justify-between gap-5 hover:shadow-xl hover:shadow-sky-900/10 dark:hover:shadow-black/40"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0F5CA8] to-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                                {dept.doctorName}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {dept.doctorQualification} · {dept.name}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {dept.isPaused ? (
                              <LivePulseIndicator variant="warning" label="Paused" />
                            ) : dept.activeEmergencyMinutes > 0 ? (
                              <LivePulseIndicator
                                variant="urgent"
                                label={`Emergency +${dept.activeEmergencyMinutes}m`}
                              />
                            ) : (
                              <LivePulseIndicator variant="online" label="Online" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E9F0FA] dark:border-[#1B3154] text-xs">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              Location
                            </p>
                            <p className="mt-0.5 font-semibold text-[#0B1E3D] dark:text-slate-100">
                              {dept.roomNumber}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {dept.floor}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              Live Queue
                            </p>
                            <p className="mt-0.5 font-mono tabular-nums font-semibold text-[#0F5CA8] dark:text-sky-400">
                              {waiting} waiting
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                              ~{formatDuration(forecast.estimatedWaitMinutes)} wait
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">
                              OPD Hours
                            </p>
                            <p className="mt-0.5 font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-slate-100">
                              {dept.opdHours}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                              {delayTotal > 0
                                ? `+${delayTotal}m shift`
                                : `${dept.avgConsultMinutes}m / visit`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E9F0FA] dark:border-[#1B3154]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-[#0D9488] dark:text-teal-400 shrink-0" />
                          <span className="truncate">
                            Next arrival:{' '}
                            <strong className="font-mono tabular-nums text-[#0B1E3D] dark:text-white">
                              {formatArrivalWindow(
                                forecast.arrivalWindowStart,
                                forecast.arrivalWindowEnd,
                                forecast.estimatedWaitMinutes,
                              )}
                            </strong>
                          </span>
                        </div>
                        <motion.button
                          type="button"
                          whileHover={{y: -1}}
                          whileTap={{scale: 0.97}}
                          onClick={() => bookForDepartment(dept.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Book with Doctor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.article>
                  ),
                )}
              </AnimatePresence>
            </motion.div>
          </section>
        </ScrollReveal>

        {/* 3-Step Patient Flow with Scroll Reveal */}
        <ScrollReveal>
          <section className="space-y-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                How Dynamic Arrival Windows Eliminate Corridor Overcrowding
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Designed for patients travelling from surrounding towns and villages
                so families never wait 4 to 6 hours in congested hospital halls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01.',
                  title: 'Remote Mobile Registration',
                  body: 'Select your OPD department and receive a verified digital token before leaving home, complete with queue rank and consulting room.',
                },
                {
                  step: '02.',
                  title: 'Real-Time Queue Recalculation',
                  body: 'When a doctor attends inpatient rounds, handles an emergency, or marks a no-show, every waiting token adjusts automatically in order.',
                },
                {
                  step: '03.',
                  title: 'Timed Arrival & SMS Broadcasts',
                  body: 'Receive a personalized 15-minute hospital arrival window paired with automatic SMS notifications whenever timings shift or your turn is called.',
                },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  whileHover={{y: -4, scale: 1.015}}
                  transition={{duration: 0.18, ease: CLINICAL_EASE}}
                  className="h-full clinical-card rounded-2xl p-6 space-y-3"
                >
                  <p className="font-mono text-xs font-bold text-[#0D9488] dark:text-teal-400">
                    {item.step}
                  </p>
                  <h3 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Hospital Operations & Waiting Hall Pathway Strip */}
        <ScrollReveal>
          <section className="rounded-2xl bg-gradient-to-r from-[#0B2545] via-[#0F4C81] to-[#0D6E8A] text-white p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl shadow-sky-950/20">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-teal-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Hospital Operations &amp; Waiting Hall Display</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Hospital doctor, OPD nurse, or administrator?
              </h2>
              <p className="text-sm text-sky-100/90 leading-relaxed">
                Manage live consultations, log doctor delays or emergency
                interruptions, requeue late arrivals, and review the SMS dispatch
                audit log in the Staff Console.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <motion.button
                type="button"
                whileHover={{y: -1.5}}
                whileTap={{scale: 0.97}}
                onClick={() => setView('public-board')}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-white/10 border border-white/25 rounded-xl hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
              >
                View Live OPD Board
              </motion.button>
              <motion.button
                type="button"
                whileHover={{y: -1.5}}
                whileTap={{scale: 0.97}}
                onClick={() => setView(currentStaff ? 'staff-dashboard' : 'staff-login')}
                className="px-5 py-2.5 text-sm font-semibold text-[#0B1E3D] bg-white rounded-xl hover:bg-sky-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {currentStaff ? 'Return to Staff Console' : 'Sign in to Staff Console'}
              </motion.button>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};
