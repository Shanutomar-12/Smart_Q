import React, {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  MapPin,
  Phone,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  AnimatedCheckmark,
  AnimatedModal,
  CLINICAL_EASE,
  LivePulseIndicator,
  ProgressRing,
  ShakeContainer,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {
  estimateTravelMinutes,
  formatArrivalWindow,
  formatClockTime,
  formatDuration,
  previewNewTokenEstimate,
} from '../engine/queueEngine';
import {QueueToken} from '../types/opd';

const WIZARD_STEPS = [
  {id: 1, label: 'Clinic & Slot'},
  {id: 2, label: 'Patient Details'},
  {id: 3, label: 'Review & Confirm'},
] as const;

type ArrivalPreference = 'LIVE_NEXT' | 'BUFFER_15' | 'TRAVEL_SYNC';

export const RegisterPage: React.FC = () => {
  const {
    departments,
    tokens,
    registerPatient,
    setView,
    setSelectedPatientTokenId,
    preselectedDeptId,
    setPreselectedDeptId,
  } = useOpd();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [departmentId, setDepartmentId] = useState(
    preselectedDeptId ?? departments[0]?.id ?? 'dept-card',
  );
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [arrivalPref, setArrivalPref] = useState<ArrivalPreference>('LIVE_NEXT');

  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [age, setAge] = useState('38');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [locality, setLocality] = useState('');
  const [distanceKm, setDistanceKm] = useState('15');
  const [visitReason, setVisitReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [confirmedToken, setConfirmedToken] = useState<QueueToken | null>(null);

  useEffect(() => {
    if (preselectedDeptId) {
      setDepartmentId(preselectedDeptId);
      setPreselectedDeptId(null);
    }
  }, [preselectedDeptId, setPreselectedDeptId]);

  const selectedDept =
    departments.find((d) => d.id === departmentId) ?? departments[0];

  const liveForecast = useMemo(
    () => previewNewTokenEstimate(selectedDept, tokens),
    [selectedDept, tokens],
  );

  const deptTokensCount = tokens.filter(
    (t) => t.departmentId === selectedDept.id,
  ).length;
  const deptCompletedCount = tokens.filter(
    (t) => t.departmentId === selectedDept.id && t.status === 'COMPLETED',
  ).length;
  const clinicThroughputPct = deptTokensCount
    ? Math.round((deptCompletedCount / deptTokensCount) * 100)
    : 0;

  const parsedDistance = Math.max(0, Number(distanceKm) || 0);
  const travelMinutes = estimateTravelMinutes(parsedDistance);

  const opdDays = useMemo(() => {
    const base = new Date();
    return [0, 1, 2, 3].map((offset) => {
      const d = new Date(base.getTime() + offset * 86400000);
      return {
        offset,
        dayName: offset === 0 ? 'Today' : d.toLocaleDateString('en-IN', {weekday: 'short'}),
        dateLabel: d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}),
        isLive: offset === 0,
      };
    });
  }, []);

  const arrivalOptions = useMemo(() => {
    const start = liveForecast.arrivalWindowStart;
    const end = liveForecast.arrivalWindowEnd;
    return [
      {
        id: 'LIVE_NEXT' as const,
        title: 'Next Live Queue Window',
        subtitle: 'Immediate dynamic rank in today’s active OPD queue',
        windowText: formatArrivalWindow(start, end, liveForecast.estimatedWaitMinutes),
      },
      {
        id: 'BUFFER_15' as const,
        title: 'Standard Check-in (+10m early buffer)',
        subtitle: 'Recommended if collecting old OPD slips or lab prints',
        windowText: formatArrivalWindow(
          Math.max(Date.now(), start - 10 * 60000),
          end,
          liveForecast.estimatedWaitMinutes,
        ),
      },
      {
        id: 'TRAVEL_SYNC' as const,
        title: 'Village Transit Sync',
        subtitle: 'SMS departure alert paired with road travel distance',
        windowText: `Est. consult ${formatClockTime(liveForecast.estimatedConsultTimestamp)}`,
      },
    ];
  }, [liveForecast]);

  const phoneDigits = phone.replace(/\D/g, '');
  const isNameValid = patientName.trim().length >= 2;
  const isPhoneValid = phoneDigits.length >= 10;
  const parsedAge = Number(age);
  const isAgeValid = Number.isFinite(parsedAge) && parsedAge >= 0 && parsedAge <= 120 && age.trim() !== '';

  const triggerError = (msg: string) => {
    setError(msg);
    setShakeKey((k) => k + 1);
  };

  const handleNextFromStep2 = () => {
    setError(null);
    if (!isNameValid) {
      triggerError('Please enter the patient full name (at least 2 characters).');
      return;
    }
    if (!isPhoneValid) {
      triggerError('Please enter a valid 10-digit mobile number for SMS alerts.');
      return;
    }
    if (!isAgeValid) {
      triggerError('Please enter a valid patient age (0 – 120).');
      return;
    }
    setStep(3);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isNameValid || !isPhoneValid || !isAgeValid) {
      setStep(2);
      triggerError('Please review and complete the required patient fields.');
      return;
    }

    const token = registerPatient({
      patientName,
      phone,
      age: parsedAge,
      gender,
      locality,
      distanceKm: parsedDistance,
      departmentId: selectedDept.id,
      visitReason,
    });
    setConfirmedToken(token);
  };

  const handleOpenDashboard = () => {
    if (confirmedToken) {
      setSelectedPatientTokenId(confirmedToken.id);
      setConfirmedToken(null);
      setView('patient-dashboard');
    }
  };

  const confirmedDept = confirmedToken
    ? departments.find((d) => d.id === confirmedToken.departmentId) ?? selectedDept
    : selectedDept;

  const progressPercent = step === 1 ? 33.3 : step === 2 ? 66.6 : 100;

  return (
    <div className="clinical-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Page Heading */}
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
            Guided OPD Intake · Zero Corridor Waiting
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#0B1E3D] dark:text-white">
            Book Digital OPD Token
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Complete three quick steps to reserve your queue number before leaving
            home. Your hospital arrival window recalculates automatically in real
            time.
          </p>
        </div>

        {/* Animated Step-by-Step Progress Bar */}
        <div className="clinical-card rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {WIZARD_STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isActive = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id as 1 | 2 | 3);
                  }}
                  className={`flex items-center gap-2.5 text-left transition-colors ${
                    s.id < step ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full font-mono text-xs font-bold flex items-center justify-center transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-[#0D9488] text-white'
                        : isActive
                          ? 'bg-[#0F5CA8] text-white ring-4 ring-sky-500/20'
                          : 'bg-[#E7F0FC] dark:bg-[#162947] text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                      isActive
                        ? 'text-[#0B1E3D] dark:text-white'
                        : isCompleted
                          ? 'text-[#0D9488] dark:text-teal-400'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-1.5 rounded-full bg-[#DCE7F5] dark:bg-[#162947] overflow-hidden">
            <motion.div
              initial={false}
              animate={{scaleX: progressPercent / 100}}
              transition={{duration: 0.35, ease: CLINICAL_EASE}}
              style={{transformOrigin: 'left'}}
              className="h-full rounded-full bg-gradient-to-r from-[#0F5CA8] via-sky-500 to-[#0D9488]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Multi-Step Wizard Card */}
          <form
            onSubmit={handleConfirmBooking}
            className="lg:col-span-7 clinical-card rounded-2xl p-6 sm:p-8 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{opacity: 0, x: -12}}
                  animate={{opacity: 1, x: 0}}
                  exit={{opacity: 0, x: 12}}
                  transition={{duration: 0.22, ease: CLINICAL_EASE}}
                  className="space-y-6"
                >
                  <div className="border-b border-[#E2ECF8] dark:border-[#1B3154] pb-4">
                    <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                      Step 1 · Select OPD Department &amp; Arrival Window
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose the specialty clinic and confirm your preferred arrival
                      slot.
                    </p>
                  </div>

                  {/* Department Grid */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-semibold text-[#0B1E3D] dark:text-slate-100">
                      OPD Clinic
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {departments.map((dept) => {
                        const isSelected = dept.id === selectedDept.id;
                        const forecast = previewNewTokenEstimate(dept, tokens);
                        return (
                          <motion.button
                            key={dept.id}
                            type="button"
                            whileHover={{y: -2}}
                            whileTap={{scale: 0.98}}
                            transition={{duration: 0.14}}
                            onClick={() => setDepartmentId(dept.id)}
                            className={`text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? 'border-[#0F5CA8] dark:border-sky-400 bg-[#EFF6FF] dark:bg-sky-950/50 shadow-sm'
                                : 'border-[#DCE7F5] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] hover:border-sky-300 dark:hover:border-sky-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                                {dept.name}
                              </span>
                              <span className="font-mono text-xs font-bold text-[#0F5CA8] dark:text-sky-400">
                                {dept.code}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 truncate">
                              {dept.doctorName} · {dept.roomNumber}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                Wait ~{formatDuration(forecast.estimatedWaitMinutes)}
                              </span>
                              {dept.isPaused ? (
                                <LivePulseIndicator variant="warning" label="Paused" />
                              ) : dept.activeEmergencyMinutes > 0 ? (
                                <LivePulseIndicator variant="urgent" label="Emergency" />
                              ) : (
                                <LivePulseIndicator variant="online" label="Online" />
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clinic Session Calendar Strip */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-[#0B1E3D] dark:text-slate-100 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400" />
                        <span>OPD Session Date</span>
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Live tokens issue for today&apos;s active queue
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {opdDays.map((d) => {
                        const selected = selectedDayOffset === d.offset;
                        return (
                          <button
                            key={d.offset}
                            type="button"
                            disabled={!d.isLive}
                            onClick={() => setSelectedDayOffset(d.offset)}
                            className={`p-3 rounded-xl border text-center transition-colors ${
                              selected
                                ? 'border-[#0F5CA8] dark:border-sky-400 bg-[#EFF6FF] dark:bg-sky-950/50 text-[#0B1E3D] dark:text-white cursor-pointer'
                                : d.isLive
                                  ? 'border-[#DCE7F5] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] text-slate-700 dark:text-slate-300 cursor-pointer'
                                  : 'border-[#E9F0FA] dark:border-[#142542] bg-slate-50/70 dark:bg-[#0A1424] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <div className="text-xs font-bold">{d.dayName}</div>
                            <div className="font-mono tabular-nums text-xs mt-0.5">
                              {d.dateLabel}
                            </div>
                            <div className="text-[10px] mt-1 font-medium text-[#0D9488] dark:text-teal-400">
                              {d.isLive ? 'Live Queue' : 'Opens 8 AM'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Arrival Window Picker */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-semibold text-[#0B1E3D] dark:text-slate-100">
                      Hospital Arrival Slot Preference
                    </label>
                    <div className="space-y-2.5">
                      {arrivalOptions.map((opt) => {
                        const active = arrivalPref === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setArrivalPref(opt.id)}
                            className={`w-full text-left p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer ${
                              active
                                ? 'border-[#0F5CA8] dark:border-sky-400 bg-[#EFF6FF] dark:bg-sky-950/40'
                                : 'border-[#DCE7F5] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] hover:border-sky-300 dark:hover:border-sky-700'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                {opt.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {opt.subtitle}
                              </p>
                            </div>
                            <span className="font-mono tabular-nums text-xs font-bold text-[#0F5CA8] dark:text-sky-400 whitespace-nowrap">
                              {opt.windowText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Free government OPD token · Instant SMS updates
                    </p>
                    <motion.button
                      type="button"
                      whileHover={{y: -1.5}}
                      whileTap={{scale: 0.97}}
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-xl shadow-md shadow-sky-900/15 cursor-pointer whitespace-nowrap"
                    >
                      <span>Continue to Patient Info</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{opacity: 0, x: 14}}
                  animate={{opacity: 1, x: 0}}
                  exit={{opacity: 0, x: -14}}
                  transition={{duration: 0.22, ease: CLINICAL_EASE}}
                  className="space-y-6"
                >
                  <div className="border-b border-[#E2ECF8] dark:border-[#1B3154] pb-4">
                    <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                      Step 2 · Patient Contact &amp; Travel Details
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      SMS advisories and live departure alerts are sent to this
                      mobile number.
                    </p>
                  </div>

                  {error && (
                    <ShakeContainer shakeKey={shakeKey}>
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
                      >
                        {error}
                      </div>
                    </ShakeContainer>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="reg-name"
                          className="text-sm font-medium text-[#0B1E3D] dark:text-slate-100"
                        >
                          Patient Full Name
                        </label>
                        {isNameValid && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Valid
                          </span>
                        )}
                      </div>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        placeholder="e.g. Sunita Devi"
                        value={patientName}
                        onChange={(e) => {
                          setPatientName(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20 transition-shadow"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="reg-phone"
                          className="text-sm font-medium text-[#0B1E3D] dark:text-slate-100"
                        >
                          Mobile Number
                        </label>
                        {isPhoneValid && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Ready
                          </span>
                        )}
                      </div>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        placeholder="+919811223344"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full font-mono tabular-nums rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20 transition-shadow"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="reg-age"
                          className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                        >
                          Age (yrs)
                        </label>
                        <input
                          id="reg-age"
                          type="number"
                          min={0}
                          max={120}
                          required
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full font-mono tabular-nums rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="reg-gender"
                          className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                        >
                          Gender
                        </label>
                        <select
                          id="reg-gender"
                          value={gender}
                          onChange={(e) =>
                            setGender(e.target.value as 'Male' | 'Female' | 'Other')
                          }
                          className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="reg-locality"
                        className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                      >
                        Village / Locality
                      </label>
                      <input
                        id="reg-locality"
                        type="text"
                        placeholder="e.g. Rampur Village"
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="reg-distance"
                        className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                      >
                        Distance to Hospital (km)
                      </label>
                      <input
                        id="reg-distance"
                        type="number"
                        min={0}
                        max={300}
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        className="w-full font-mono tabular-nums rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="reg-reason"
                        className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                      >
                        Primary Symptom / Visit Purpose (optional)
                      </label>
                      <input
                        id="reg-reason"
                        type="text"
                        placeholder="e.g. Blood pressure checkup, chest discomfort, follow-up"
                        value={visitReason}
                        onChange={(e) => setVisitReason(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <motion.button
                      type="button"
                      whileTap={{scale: 0.97}}
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer whitespace-nowrap"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{y: -1.5}}
                      whileTap={{scale: 0.97}}
                      onClick={handleNextFromStep2}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0F5CA8] hover:bg-[#0C4A88] rounded-xl shadow-md shadow-sky-900/15 cursor-pointer whitespace-nowrap"
                    >
                      <span>Review &amp; Confirm</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{opacity: 0, x: 14}}
                  animate={{opacity: 1, x: 0}}
                  exit={{opacity: 0, x: -14}}
                  transition={{duration: 0.22, ease: CLINICAL_EASE}}
                  className="space-y-6"
                >
                  <div className="border-b border-[#E2ECF8] dark:border-[#1B3154] pb-4">
                    <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                      Step 3 · Review &amp; Issue Digital OPD Token
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Verify your details below. Your token and arrival SMS will
                      dispatch immediately.
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F8FBFF] dark:bg-[#0A1629] border border-[#DCE7F5] dark:border-[#1B3154] divide-y divide-[#E9F0FA] dark:divide-[#1B3154]">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Stethoscope className="w-5 h-5 text-[#0F5CA8] dark:text-sky-400 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Selected Clinic &amp; Doctor
                          </p>
                          <p className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                            {selectedDept.name} · {selectedDept.doctorName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedDept.roomNumber} ({selectedDept.floor})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Patient Name
                        </p>
                        <p className="font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                          {patientName} ({age}y, {gender})
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          SMS Mobile Number
                        </p>
                        <p className="font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white mt-0.5">
                          {phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Origin &amp; Distance
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {locality.trim() || 'Local District'} ({parsedDistance} km · ~
                          {formatDuration(travelMinutes)} travel)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Visit Purpose
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {visitReason.trim() || 'General OPD Consultation'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <motion.button
                      type="button"
                      whileTap={{scale: 0.97}}
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer whitespace-nowrap"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Edit Details</span>
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{y: -2}}
                      whileTap={{scale: 0.97}}
                      className="cta-warm-btn inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      <span>Generate OPD Queue Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Sticky Live Queue Forecast Panel */}
          <aside className="lg:col-span-5 clinical-card rounded-2xl overflow-hidden lg:sticky lg:top-24">
            <div className="px-6 py-6 bg-gradient-to-br from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white">
              <p className="text-xs font-medium text-teal-100">
                Live Queue Forecast · {selectedDept.name}
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={liveForecast.nextTokenNumber}
                  initial={{opacity: 0, y: 6}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -6}}
                  transition={{duration: 0.18, ease: CLINICAL_EASE}}
                  className="mt-2 flex items-baseline justify-between gap-4"
                >
                  <span className="font-mono tabular-nums text-3xl font-bold tracking-tight">
                    {liveForecast.nextTokenNumber}
                  </span>
                  <span className="text-xs text-sky-100 font-semibold">
                    Queue Rank #{liveForecast.position}
                  </span>
                </motion.div>
              </AnimatePresence>
              <p className="mt-2 text-xs text-sky-100/85">
                {selectedDept.doctorName} ({selectedDept.doctorQualification}) ·{' '}
                {selectedDept.roomNumber}
              </p>
            </div>

            <div className="p-6 space-y-5 bg-white dark:bg-[#0E1C33]">
              {selectedDept.isPaused && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <strong className="font-semibold">Queue currently paused:</strong>{' '}
                  {selectedDept.pauseReason || 'Temporarily paused by staff'}.
                  Estimated times include a safety buffer.
                </div>
              )}

              {(selectedDept.activeDelayMinutes > 0 ||
                selectedDept.activeEmergencyMinutes > 0) && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <strong className="font-semibold">Schedule adjustment active:</strong>{' '}
                  {selectedDept.activeAdvisoryText}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Recommended Hospital Arrival Window
                  </p>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#0F5CA8] dark:text-sky-400">
                    {formatArrivalWindow(
                      liveForecast.arrivalWindowStart,
                      liveForecast.arrivalWindowEnd,
                      liveForecast.estimatedWaitMinutes,
                    )}
                  </p>
                </div>
                <ProgressRing
                  progress={clinicThroughputPct}
                  size={68}
                  strokeWidth={6}
                  label={`${clinicThroughputPct}%`}
                  sublabel="done"
                  indicatorClass="stroke-[#0D9488] dark:stroke-teal-400"
                />
              </div>

              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2ECF8] dark:border-[#1B3154] text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Est. Consultation
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white">
                    {formatClockTime(liveForecast.estimatedConsultTimestamp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Estimated Wait
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white">
                    {formatDuration(liveForecast.estimatedWaitMinutes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Patients Ahead
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white">
                    {liveForecast.patientsAhead}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Avg. Pace / Patient
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-semibold text-[#0B1E3D] dark:text-white">
                    {selectedDept.avgConsultMinutes} min
                  </dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-[#E2ECF8] dark:border-[#1B3154] space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    Travel estimate for{' '}
                    <strong className="font-mono tabular-nums text-[#0B1E3D] dark:text-white">
                      {parsedDistance} km
                    </strong>
                    : approx.{' '}
                    <strong className="font-mono tabular-nums text-[#0B1E3D] dark:text-white">
                      {formatDuration(travelMinutes)}
                    </strong>{' '}
                    by road.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Automatic SMS alerts sent on confirmation, delays, emergencies,
                    and when your turn is called.
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Spring Confirmation Modal with Animated Checkmark */}
      <AnimatedModal
        open={Boolean(confirmedToken)}
        onClose={() => setConfirmedToken(null)}
        ariaLabelledBy="token-confirmed-title"
      >
        {confirmedToken && (
          <>
            <div className="px-6 py-5 bg-gradient-to-r from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <AnimatedCheckmark className="w-7 h-7 text-teal-200 shrink-0" />
                <div>
                  <h2
                    id="token-confirmed-title"
                    className="text-lg font-bold tracking-tight"
                  >
                    OPD Token Confirmed
                  </h2>
                  <p className="text-xs text-sky-100 mt-0.5">
                    SMS confirmation dispatched to {confirmedToken.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmedToken(null)}
                aria-label="Close confirmation modal"
                className="text-sky-200 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white dark:bg-[#0E1C33]">
              <div className="flex items-baseline justify-between pb-5 border-b border-[#E2ECF8] dark:border-[#1B3154]">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Token Number
                  </p>
                  <p className="mt-1 font-mono tabular-nums text-4xl font-bold text-[#0B1E3D] dark:text-white">
                    {confirmedToken.tokenNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Department
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                    {confirmedDept.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {confirmedDept.roomNumber} · {confirmedDept.doctorName}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#EFF6FF] dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/70 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recommended Hospital Arrival Window</span>
                </div>
                <p className="font-mono tabular-nums text-xl font-bold text-[#0B1E3D] dark:text-white">
                  {formatArrivalWindow(
                    confirmedToken.arrivalWindowStart,
                    confirmedToken.arrivalWindowEnd,
                    confirmedToken.estimatedWaitMinutes,
                  )}
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Queue Position
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-bold text-[#0B1E3D] dark:text-white">
                    #{confirmedToken.position}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Est. Consultation
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-bold text-[#0B1E3D] dark:text-white">
                    {formatClockTime(confirmedToken.estimatedConsultTimestamp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Est. Wait
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-bold text-[#0B1E3D] dark:text-white">
                    {formatDuration(confirmedToken.estimatedWaitMinutes)}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedToken(null);
                    setStep(1);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-[#CBD9EE] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132544] cursor-pointer"
                >
                  Register Another
                </button>
                <motion.button
                  type="button"
                  whileHover={{y: -1.5}}
                  whileTap={{scale: 0.97}}
                  onClick={handleOpenDashboard}
                  className="cta-warm-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  <span>Open Live Patient Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </AnimatedModal>
    </div>
  );
};
