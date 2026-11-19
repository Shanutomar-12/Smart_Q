import React, {useState} from 'react';
import {motion} from 'motion/react';
import {AlertTriangle, CheckCircle2, Clock, Siren} from 'lucide-react';
import {
  FloatingEmptyState,
  LivePulseIndicator,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {formatClockTime} from '../engine/queueEngine';

const DELAY_PRESETS = [10, 15, 20, 30, 45];
const EMERGENCY_PRESETS = [15, 20, 25, 40];

export const StaffDelaysPage: React.FC = () => {
  const {
    departments,
    tokens,
    events,
    activeStaffDeptId,
    logDoctorDelay,
    logEmergencyCase,
    clearActiveOffset,
  } = useOpd();

  const [delayMinutes, setDelayMinutes] = useState<number>(20);
  const [delayReason, setDelayReason] = useState('Attending inpatient rounds');

  const [emergencyMinutes, setEmergencyMinutes] = useState<number>(25);
  const [emergencyCategory, setEmergencyCategory] = useState('Cardiac Emergency');
  const [emergencyNotes, setEmergencyNotes] = useState(
    'Unscheduled emergency evaluation requiring consulting doctor in casualty ward.',
  );

  const dept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];

  const affectedWaitingCount = tokens.filter(
    (t) =>
      t.departmentId === dept.id &&
      (t.status === 'WAITING' || t.status === 'CALLED'),
  ).length;

  const disruptionEvents = events.filter(
    (e) =>
      e.departmentId === dept.id &&
      (e.type === 'DOCTOR_DELAY' ||
        e.type === 'EMERGENCY_CASE' ||
        e.type === 'DELAY_CLEARED' ||
        e.type === 'QUEUE_PAUSED' ||
        e.type === 'QUEUE_RESUMED'),
  );

  const totalOffset = dept.activeDelayMinutes + dept.activeEmergencyMinutes;

  const handleDelaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (delayMinutes <= 0) return;
    logDoctorDelay(dept.id, delayMinutes, delayReason);
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emergencyMinutes <= 0) return;
    logEmergencyCase(dept.id, emergencyMinutes, emergencyCategory, emergencyNotes);
  };

  return (
    <div className="space-y-8">
      {/* Current Active Offset Summary Bar */}
      <section className="clinical-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Current Active Schedule Offset · {dept.name}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={`font-mono tabular-nums text-2xl font-bold ${
                totalOffset > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {totalOffset > 0 ? `+${totalOffset} minutes` : 'On Schedule (0 min)'}
            </span>
            {totalOffset > 0 && (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Doctor delay: {dept.activeDelayMinutes}m · Emergency:{' '}
                {dept.activeEmergencyMinutes}m
              </span>
            )}
          </div>
          {dept.activeAdvisoryText && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {dept.activeAdvisoryText}
            </p>
          )}
        </div>

        {totalOffset > 0 && (
          <motion.button
            type="button"
            whileTap={{scale: 0.97}}
            onClick={() => clearActiveOffset(dept.id)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Clear Offset &amp; Restore Baseline</span>
          </motion.button>
        )}
      </section>

      {/* Two Side-by-Side Operational Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Doctor Delay Panel */}
        <form
          onSubmit={handleDelaySubmit}
          className="clinical-card rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2ECF8] dark:border-[#1B3154]">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                  Log Doctor Schedule Delay
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Use for inpatient rounds, OT handover, or clinical review delays.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100">
              Delay Duration (minutes)
            </label>
            <div className="flex flex-wrap gap-2">
              {DELAY_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`px-3 py-1.5 font-mono tabular-nums text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    delayMinutes === mins
                      ? 'bg-[#0F5CA8] text-white border-[#0F5CA8]'
                      : 'bg-white dark:bg-[#0A1629] text-slate-700 dark:text-slate-200 border-[#CBD9EE] dark:border-[#1B3154] hover:bg-[#EFF6FF] dark:hover:bg-[#132544]'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={180}
                value={delayMinutes}
                onChange={(e) =>
                  setDelayMinutes(Math.max(5, Number(e.target.value) || 5))
                }
                aria-label="Custom delay minutes"
                className="w-20 font-mono tabular-nums rounded-lg border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-2.5 py-1.5 text-xs text-[#0B1E3D] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="delay-reason"
              className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
            >
              Reason Shown to Patients
            </label>
            <input
              id="delay-reason"
              type="text"
              required
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="e.g. Attending inpatient rounds"
              className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Shifts {affectedWaitingCount} waiting tokens +{delayMinutes} min
            </span>
            <motion.button
              type="submit"
              whileHover={{y: -1}}
              whileTap={{scale: 0.97}}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Apply Delay &amp; Notify Patients</span>
            </motion.button>
          </div>
        </form>

        {/* Emergency Case Interruption Panel */}
        <form
          onSubmit={handleEmergencySubmit}
          className="clinical-card rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2ECF8] dark:border-[#1B3154]">
            <div className="flex items-start gap-3">
              <Siren className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                  Record Emergency Case Interruption
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Immediately postpones waiting arrival windows and sends an urgent
                  SMS broadcast.
                </p>
              </div>
            </div>
            <LivePulseIndicator variant="urgent" label="Priority" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100">
              Estimated Emergency Offset (minutes)
            </label>
            <div className="flex flex-wrap gap-2">
              {EMERGENCY_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEmergencyMinutes(mins)}
                  className={`px-3 py-1.5 font-mono tabular-nums text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    emergencyMinutes === mins
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white dark:bg-[#0A1629] text-slate-700 dark:text-slate-200 border-[#CBD9EE] dark:border-[#1B3154] hover:bg-red-50 dark:hover:bg-red-950/40'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={180}
                value={emergencyMinutes}
                onChange={(e) =>
                  setEmergencyMinutes(Math.max(5, Number(e.target.value) || 5))
                }
                aria-label="Custom emergency minutes"
                className="w-20 font-mono tabular-nums rounded-lg border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-2.5 py-1.5 text-xs text-[#0B1E3D] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="emg-cat"
                className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
              >
                Emergency Category
              </label>
              <select
                id="emg-cat"
                value={emergencyCategory}
                onChange={(e) => setEmergencyCategory(e.target.value)}
                className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
              >
                <option value="Cardiac Emergency">Cardiac Emergency</option>
                <option value="Trauma / Accident">Trauma / Accident</option>
                <option value="Critical ICU / Ward Call">
                  Critical ICU / Ward Call
                </option>
                <option value="Acute Paediatric Emergency">
                  Acute Paediatric Emergency
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="emg-notes"
                className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
              >
                Clinical Log Note
              </label>
              <input
                id="emg-notes"
                type="text"
                required
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] dark:focus:border-sky-400"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Urgent SMS broadcast to {affectedWaitingCount} waiting patients
            </span>
            <motion.button
              type="submit"
              whileHover={{y: -1}}
              whileTap={{scale: 0.97}}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Siren className="w-4 h-4" />
              <span>Log Emergency &amp; Broadcast SMS</span>
            </motion.button>
          </div>
        </form>
      </div>

      {/* Disruption Audit Ledger */}
      <section className="clinical-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FBFF] dark:bg-[#0A1629] border-b border-[#E2ECF8] dark:border-[#1B3154]">
          <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
            Schedule Disruption Audit Log · {dept.name}
          </h2>
        </div>
        {disruptionEvents.length === 0 ? (
          <div className="bg-white dark:bg-[#0E1C33]">
            <FloatingEmptyState
              title="Clinic running smoothly"
              description={`No schedule delays or emergency interruptions have been logged for ${dept.name} today.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2ECF8] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Time</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-6 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                {disruptionEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td className="py-3.5 px-6 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatClockTime(evt.timestamp)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0B1E3D] dark:text-white whitespace-nowrap">
                      {evt.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {evt.details}
                    </td>
                    <td className="py-3.5 px-6 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {evt.performedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
