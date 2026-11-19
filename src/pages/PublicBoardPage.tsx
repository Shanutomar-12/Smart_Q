import React, {useEffect, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {AlertTriangle, Volume2, VolumeX} from 'lucide-react';
import {
  CLINICAL_EASE,
  EcgPulseLine,
  FloatingEmptyState,
  LivePulseIndicator,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  formatArrivalWindow,
  formatClockTime,
  formatDuration,
  getStatusMeta,
} from '../engine/queueEngine';

function playHospitalChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext})
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } catch {
    // Ignore browser audio restrictions
  }
}

export const PublicBoardPage: React.FC = () => {
  const {departments, tokens} = useOpd();
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0]?.id ?? 'dept-card',
  );
  const [nowClock, setNowClock] = useState<number>(Date.now());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  useEffect(() => {
    const timer = window.setInterval(() => setNowClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isAllMode = selectedDeptId === 'ALL';
  const activeDept =
    departments.find((d) => d.id === selectedDeptId) ?? departments[0];

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) playHospitalChime();
  };

  const renderSingleDepartmentBoard = () => {
    const deptTokens = tokens.filter((t) => t.departmentId === activeDept.id);
    const inConsult = deptTokens.find((t) => t.status === 'IN_CONSULTATION');
    const called = deptTokens.find((t) => t.status === 'CALLED');
    const waiting = deptTokens
      .filter((t) => t.status === 'WAITING')
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

    const currentHeroToken = inConsult ?? called;
    const isDisrupted =
      activeDept.isPaused ||
      activeDept.activeDelayMinutes > 0 ||
      activeDept.activeEmergencyMinutes > 0;

    return (
      <motion.div
        key={activeDept.id}
        initial={{opacity: 0, y: 10}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.24, ease: CLINICAL_EASE}}
        className="space-y-6"
      >
        {isDisrupted && (
          <div
            className={`rounded-2xl border px-6 py-4 flex items-center justify-between gap-4 ${
              activeDept.activeEmergencyMinutes > 0
                ? 'bg-red-950/65 border-red-700/70 text-red-100'
                : 'bg-amber-950/55 border-amber-600/60 text-amber-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
              <div className="text-sm tracking-[0.01em]">
                <strong className="font-semibold">
                  {activeDept.isPaused
                    ? `${activeDept.name} Queue Temporarily Paused:`
                    : activeDept.activeEmergencyMinutes > 0
                      ? 'Urgent Emergency Interruption:'
                      : 'Schedule Advisory:'}
                </strong>{' '}
                {activeDept.isPaused
                  ? activeDept.pauseReason || 'OPD will resume shortly.'
                  : activeDept.activeAdvisoryText}
              </div>
            </div>
            <LivePulseIndicator
              variant={activeDept.activeEmergencyMinutes > 0 ? 'urgent' : 'warning'}
              label={activeDept.activeEmergencyMinutes > 0 ? 'Emergency' : 'Advisory'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Primary Corridor Readout: NOW SERVING */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#0E2647] to-[#08152B] border border-[#1B3861] rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-xl shadow-black/35">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wider text-teal-300">
                  NOW SERVING · {activeDept.name.toUpperCase()}
                </p>
                <LivePulseIndicator
                  variant={activeDept.isPaused ? 'warning' : 'online'}
                  label={activeDept.isPaused ? 'Paused' : 'Live'}
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHeroToken?.tokenNumber ?? 'OPEN'}
                  initial={{opacity: 0, y: 14}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -12}}
                  transition={{duration: 0.25, ease: CLINICAL_EASE}}
                >
                  <div className="font-mono tabular-nums text-6xl sm:text-7xl font-bold tracking-tight text-white">
                    {currentHeroToken ? currentHeroToken.tokenNumber : 'OPEN'}
                  </div>
                  <p className="text-base text-sky-100 font-medium pt-2">
                    {currentHeroToken
                      ? `${currentHeroToken.patientName} · ${getStatusMeta(currentHeroToken.status).label}`
                      : 'Ready for next patient'}
                  </p>
                </motion.div>
              </AnimatePresence>
              <EcgPulseLine
                className="w-full h-7 pt-1"
                strokeClassName="stroke-teal-400"
              />
            </div>

            <div className="pt-6 border-t border-[#1B3861] grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-sky-300/80">Consultation Room</p>
                <p className="mt-1 font-semibold text-white">
                  {activeDept.roomNumber}
                </p>
                <p className="text-xs text-sky-300/70">{activeDept.floor}</p>
              </div>
              <div>
                <p className="text-xs text-sky-300/80">Consulting Doctor</p>
                <p className="mt-1 font-semibold text-white">
                  {activeDept.doctorName}
                </p>
                <p className="text-xs text-sky-300/70">
                  Avg. {activeDept.avgConsultMinutes} min / visit
                </p>
              </div>
            </div>

            {called && inConsult && (
              <motion.div
                initial={{opacity: 0, scale: 0.98}}
                animate={{opacity: 1, scale: 1}}
                className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-semibold text-amber-300">
                    CALLED TO DOOR
                  </p>
                  <p className="text-sm text-white font-medium">
                    {called.patientName} — please proceed to {activeDept.roomNumber}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-2xl font-bold text-amber-300">
                  {called.tokenNumber}
                </span>
              </motion.div>
            )}
          </div>

          {/* Upcoming Waiting Queue Display */}
          <div className="lg:col-span-7 bg-[#0B1931] border border-[#1A3154] rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-black/25">
            <div className="px-6 py-4 border-b border-[#1A3154] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Upcoming Queue · {activeDept.name}
                </h2>
                <p className="text-xs text-sky-300/75 mt-0.5">
                  Times update automatically on delays, emergencies, and completions
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-teal-300">
                {waiting.length} waiting
              </span>
            </div>

            {waiting.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <FloatingEmptyState
                  title="Waiting queue is clear"
                  description={`No waiting tokens remaining in ${activeDept.name} right now.`}
                />
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1A3154] text-xs font-medium text-sky-300/75">
                      <th className="py-3.5 px-6">Rank</th>
                      <th className="py-3.5 px-4">Token</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4 text-right">Est. Wait</th>
                      <th className="py-3.5 px-6 text-right">Arrival Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A3154] text-sm">
                    {waiting.map((tok, index) => (
                      <motion.tr
                        key={tok.id}
                        layout
                        initial={{opacity: 0, x: -6}}
                        animate={{opacity: 1, x: 0}}
                        transition={{
                          duration: 0.22,
                          delay: index * 0.035,
                          ease: CLINICAL_EASE,
                        }}
                        className={index === 0 ? 'bg-sky-500/15' : ''}
                      >
                        <td className="py-4 px-6 font-mono tabular-nums text-sky-200">
                          #{tok.position}
                        </td>
                        <td className="py-4 px-4 font-mono tabular-nums text-lg font-bold text-white whitespace-nowrap">
                          {tok.tokenNumber}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">
                            {tok.patientName}
                          </div>
                          <div className="text-xs text-sky-300/75">
                            {tok.locality}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono tabular-nums text-sky-100 whitespace-nowrap">
                          {formatDuration(tok.estimatedWaitMinutes)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono tabular-nums text-teal-300 font-semibold whitespace-nowrap">
                          {formatArrivalWindow(
                            tok.arrivalWindowStart,
                            tok.arrivalWindowEnd,
                            tok.estimatedWaitMinutes,
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] board-atmosphere text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Corridor Board Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1A3154]">
          <div>
            <p className="text-xs font-semibold text-teal-300 tracking-wide">
              District Civil Hospital · Waiting Hall Display
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Live OPD Queue Board
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <motion.button
              type="button"
              whileTap={{scale: 0.97}}
              onClick={handleToggleAudio}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-[#1A3154] bg-[#0B1931] text-sky-100 hover:bg-[#122647] cursor-pointer whitespace-nowrap"
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-teal-300" />
                  <span>Chime Ready</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Chime Muted</span>
                </>
              )}
            </motion.button>

            <div className="text-right font-mono tabular-nums">
              <div className="text-lg font-bold text-white">
                {new Date(nowClock).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </div>
              <div className="text-xs text-sky-300/75">
                {new Date(nowClock).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fluid Sliding Department Switcher */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0B1931] border border-[#1A3154] overflow-x-auto max-w-full">
          {[
            ...departments.map((d) => ({id: d.id, label: d.name})),
            {id: 'ALL', label: 'All Departments'},
          ].map((item) => {
            const active = selectedDeptId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDeptId(item.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'text-[#061229] font-semibold' : 'text-sky-200 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="board-dept-tab"
                    transition={{type: 'spring', stiffness: 460, damping: 35}}
                    className="absolute inset-0 rounded-lg bg-teal-300"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Board Content */}
        {isAllMode ? (
          <motion.div
            key="all-depts"
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.24, ease: CLINICAL_EASE}}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {departments.map((dept) => {
              const deptTokens = tokens.filter((t) => t.departmentId === dept.id);
              const current =
                deptTokens.find((t) => t.status === 'IN_CONSULTATION') ??
                deptTokens.find((t) => t.status === 'CALLED');
              const nextUp = deptTokens
                .filter((t) => t.status === 'WAITING')
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                .slice(0, 3);

              return (
                <div
                  key={dept.id}
                  className="bg-[#0B1931] border border-[#1A3154] rounded-2xl p-6 space-y-5 shadow-lg shadow-black/25"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[#1A3154] pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">{dept.name}</h2>
                      <p className="text-xs text-sky-300/75 mt-0.5">
                        {dept.roomNumber} · {dept.doctorName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-teal-300">
                        NOW SERVING
                      </p>
                      <p className="font-mono tabular-nums text-3xl font-bold text-white">
                        {current ? current.tokenNumber : 'OPEN'}
                      </p>
                    </div>
                  </div>

                  {(dept.isPaused ||
                    dept.activeDelayMinutes > 0 ||
                    dept.activeEmergencyMinutes > 0) && (
                    <p className="text-xs font-medium text-amber-300">
                      {dept.isPaused
                        ? `Paused: ${dept.pauseReason || 'Resuming shortly'}`
                        : dept.activeAdvisoryText}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-sky-300/75">
                      Next in Queue
                    </p>
                    {nextUp.length === 0 ? (
                      <p className="text-sm text-slate-400">No waiting tokens.</p>
                    ) : (
                      <div className="divide-y divide-[#1A3154]">
                        {nextUp.map((tok) => (
                          <div
                            key={tok.id}
                            className="py-2.5 flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono tabular-nums font-bold text-white">
                                {tok.tokenNumber}
                              </span>
                              <span className="text-sky-100">
                                {tok.patientName}
                              </span>
                            </div>
                            <span className="font-mono tabular-nums text-xs font-semibold text-teal-300">
                              {formatClockTime(tok.estimatedConsultTimestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          renderSingleDepartmentBoard()
        )}
      </div>
    </div>
  );
};
