import React, {useState} from 'react';
import {motion} from 'motion/react';
import {ArrowRight, Lock, ShieldCheck, Stethoscope} from 'lucide-react';
import {
  AnimatedNumber,
  CLINICAL_EASE,
  EcgPulseLine,
  LivePulseIndicator,
  ShakeContainer,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {STAFF_USERS} from '../data/seedData';

export const StaffLoginPage: React.FC = () => {
  const {loginStaff, departments, tokens, smsLogs} = useOpd();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const waitingTotal = tokens.filter(
    (t) => t.status === 'WAITING' || t.status === 'CALLED',
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = loginStaff(username, password);
    if (!res.ok) {
      setError(res.error || 'Authentication failed.');
      setShakeKey((k) => k + 1);
    }
  };

  const handleQuickLogin = (user: (typeof STAFF_USERS)[number]) => {
    setError(null);
    loginStaff(user.username, user.password);
  };

  return (
    <div className="clinical-canvas">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Split Panel: Calming Clinical Shift Visual */}
          <motion.section
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.34, ease: CLINICAL_EASE}}
            className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#0F4C81] to-[#0D9488] text-white p-7 sm:p-8 flex flex-col justify-between gap-8 shadow-xl shadow-sky-950/20"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-teal-200">
                  <ShieldCheck className="w-4 h-4" />
                  <span>District Civil Hospital · SmartOPD</span>
                </span>
                <LivePulseIndicator variant="online" label="Shift Active" />
              </div>

              <div className="space-y-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  Calm, coordinated outpatient flow for every consulting room.
                </h1>
                <p className="text-sm text-sky-100/90 leading-relaxed">
                  Call patients seamlessly, record clinical diagnoses, shift
                  arrival windows during inpatient rounds or emergencies, and
                  dispatch automated SMS advisories in one console.
                </p>
              </div>

              <EcgPulseLine
                className="w-full h-10 pt-1"
                strokeClassName="stroke-teal-300"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/15">
                <div>
                  <p className="text-[11px] text-sky-200/80">Clinics</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    <AnimatedNumber value={departments.length} />
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-sky-200/80">In Queue</p>
                  <p className="mt-1 text-xl font-bold text-teal-200">
                    <AnimatedNumber value={waitingTotal} />
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-sky-200/80">SMS Sent</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    <AnimatedNumber value={smsLogs.length} />
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-4 flex items-start gap-3">
                <Stethoscope className="w-4 h-4 text-teal-200 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-100/90 leading-relaxed">
                  Role-scoped access keeps clinic doctors focused on their room
                  while giving hospital administrators visibility across all
                  departments.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Right Split Panel: Glassmorphic Sign-In + One-Click Demo Accounts */}
          <div className="lg:col-span-7 space-y-6">
            <motion.form
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.34, delay: 0.05, ease: CLINICAL_EASE}}
              onSubmit={handleSubmit}
              className="clinical-card rounded-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Hospital Staff Authentication</span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1E3D] dark:text-white">
                  Sign in to Staff Console
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Enter your hospital credentials or choose a pre-configured role
                  below.
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
                <div>
                  <label
                    htmlFor="staff-username"
                    className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                  >
                    Staff Username
                  </label>
                  <input
                    id="staff-username"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="e.g. staff.card"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full font-mono rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="staff-password"
                    className="block text-sm font-medium text-[#0B1E3D] dark:text-slate-100 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter staff password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] px-3.5 py-2.5 text-sm text-[#0B1E3D] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{y: -1.5}}
                whileTap={{scale: 0.97}}
                className="cta-warm-btn w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl cursor-pointer"
              >
                <span>Sign in to Console</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>

            {/* One-Click Demo Accounts */}
            <motion.section
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.34, delay: 0.1, ease: CLINICAL_EASE}}
              className="clinical-card rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-3.5 bg-[#F8FBFF] dark:bg-[#0A1629] border-b border-[#E2ECF8] dark:border-[#1B3154] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                    One-Click Demo Accounts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Instant login to test Admin, OPD Nurse, or Doctor workflows
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                {STAFF_USERS.map((user) => (
                  <motion.div
                    key={user.username}
                    whileHover={{x: 3}}
                    transition={{duration: 0.15, ease: CLINICAL_EASE}}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                        {user.roleLabel}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {user.fullName}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {user.username} / {user.password}
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{scale: 0.97}}
                      onClick={() => handleQuickLogin(user)}
                      className="px-3.5 py-2 text-xs font-semibold text-[#0F5CA8] dark:text-sky-300 border border-sky-200 dark:border-sky-800 bg-[#EFF6FF] dark:bg-sky-950/60 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Sign in →
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
};
