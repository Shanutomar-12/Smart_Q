import React, {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import {useOpd} from '../context/OpdContext';
import {useTheme} from '../context/ThemeContext';
import {AppView} from '../types/opd';
import {CLINICAL_EASE, LivePulseIndicator} from './MotionPrimitives';

interface StaffShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const STAFF_NAV: Array<{
  label: string;
  view: AppView;
  icon: React.ComponentType<{className?: string}>;
}> = [
  {label: 'Overview', view: 'staff-dashboard', icon: LayoutDashboard},
  {label: 'Queue Operations', view: 'staff-queue', icon: ClipboardList},
  {label: 'Delays & Emergencies', view: 'staff-delays', icon: AlertTriangle},
  {label: 'SMS Dispatch Log', view: 'staff-sms', icon: MessageSquare},
];

export const StaffShell: React.FC<StaffShellProps> = ({title, subtitle, children}) => {
  const {
    view,
    setView,
    currentStaff,
    logoutStaff,
    departments,
    activeStaffDeptId,
    setActiveStaffDeptId,
    togglePauseQueue,
    resetDemoData,
  } = useOpd();
  const {theme, toggleTheme} = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeDept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];

  const isAdmin = currentStaff?.role === 'ADMIN';

  const handleNav = (target: AppView) => {
    setView(target);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FC] dark:bg-[#071121] flex transition-colors duration-200">
      {/* Collapsible Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-[#0B172B] border-r border-[#DCE7F5] dark:border-[#1B3154] z-20 transition-[width] duration-250 ease-out ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#DCE7F5] dark:border-[#1B3154]">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setView('home')}
              className="font-display text-lg font-extrabold tracking-tight text-[#0B1E3D] dark:text-white cursor-pointer whitespace-nowrap pl-2"
            >
              Smart<span className="text-[#0F5CA8] dark:text-sky-400">OPD</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-[#132645] hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer ${
              sidebarCollapsed ? 'mx-auto' : ''
            }`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Active Department Selector (expanded mode) */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-b border-[#DCE7F5] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0E1C33]">
            <label
              htmlFor="sidebar-dept-select"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Active OPD Department
            </label>
            <select
              id="sidebar-dept-select"
              value={activeDept.id}
              onChange={(e) => setActiveStaffDeptId(e.target.value)}
              disabled={!isAdmin && Boolean(currentStaff?.departmentId)}
              className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#091529] px-3 py-2 text-sm font-medium text-[#0B1E3D] dark:text-white focus:border-[#0F5CA8] disabled:opacity-80"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              {activeDept.doctorName} · {activeDept.roomNumber}
            </p>
          </div>
        )}

        {/* Navigation Links with Fluid Sliding Highlight */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {STAFF_NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`relative w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'text-[#0F5CA8] dark:text-sky-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50/70 dark:hover:bg-[#132645] hover:text-[#0B1E3D] dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="staff-sidebar-active"
                    transition={{type: 'spring', stiffness: 450, damping: 34}}
                    className="absolute inset-0 rounded-xl bg-sky-50 dark:bg-[#132645] border border-sky-200/80 dark:border-sky-800/70"
                  />
                )}
                <Icon className="w-4 h-4 shrink-0 relative z-10" />
                {!sidebarCollapsed && <span className="relative z-10">{item.label}</span>}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#DCE7F5] dark:border-[#1B3154] space-y-1">
            <button
              type="button"
              onClick={() => handleNav('public-board')}
              title={sidebarCollapsed ? 'Live Waiting Board' : undefined}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-50/70 dark:hover:bg-[#132645] hover:text-[#0B1E3D] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Live Waiting Board</span>}
            </button>
            <button
              type="button"
              onClick={() => handleNav('home')}
              title={sidebarCollapsed ? 'Patient Portal' : undefined}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-50/70 dark:hover:bg-[#132645] hover:text-[#0B1E3D] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Patient Portal</span>}
            </button>
          </div>
        </nav>

        {/* Signed-in Staff Account Footer */}
        <div className="p-3 border-t border-[#DCE7F5] dark:border-[#1B3154] space-y-3 bg-[#F8FBFF] dark:bg-[#0E1C33]">
          {!sidebarCollapsed && (
            <div className="px-1">
              <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white truncate">
                {currentStaff?.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentStaff?.roleLabel} · {currentStaff?.username}
              </p>
            </div>
          )}
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col' : ''}`}>
            <button
              type="button"
              onClick={resetDemoData}
              title="Reset sample hospital queue data"
              className={`${
                sidebarCollapsed ? 'w-10 h-9 px-0' : 'flex-1 px-2.5 py-1.5'
              } inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#091529] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl hover:bg-sky-50 dark:hover:bg-[#132645] cursor-pointer whitespace-nowrap`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {!sidebarCollapsed && <span>Reset</span>}
            </button>
            <button
              type="button"
              onClick={logoutStaff}
              title="Sign Out"
              className={`${
                sidebarCollapsed ? 'w-10 h-9 px-0' : 'px-2.5 py-1.5'
              } inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#091529] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl hover:bg-slate-100 dark:hover:bg-[#132645] cursor-pointer whitespace-nowrap`}
            >
              <LogOut className="w-3.5 h-3.5" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer with Backdrop Blur */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.18}}
              className="fixed inset-0 bg-[#061229]/55 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{x: -288}}
              animate={{x: 0}}
              exit={{x: -288}}
              transition={{type: 'spring', stiffness: 360, damping: 34}}
              className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0B172B] h-full flex flex-col z-50 border-r border-[#DCE7F5] dark:border-[#1B3154]"
            >
              <div className="h-16 px-5 flex items-center justify-between border-b border-[#DCE7F5] dark:border-[#1B3154]">
                <span className="font-display text-lg font-extrabold text-[#0B1E3D] dark:text-white">
                  Smart<span className="text-[#0F5CA8] dark:text-sky-400">OPD</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close sidebar"
                  className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-[#DCE7F5] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0E1C33]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Active Department
                </label>
                <select
                  value={activeDept.id}
                  onChange={(e) => setActiveStaffDeptId(e.target.value)}
                  disabled={!isAdmin && Boolean(currentStaff?.departmentId)}
                  className="w-full rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#091529] px-3 py-2 text-sm font-medium text-[#0B1E3D] dark:text-white"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {STAFF_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.view;
                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => handleNav(item.view)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                        active
                          ? 'bg-sky-50 dark:bg-[#132645] text-[#0F5CA8] dark:text-sky-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50/50 dark:hover:bg-[#10213D]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleNav('public-board')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50/50 dark:hover:bg-[#10213D] cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Live Waiting Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('home')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50/50 dark:hover:bg-[#10213D] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Patient Portal</span>
                </button>
              </nav>
              <div className="p-4 border-t border-[#DCE7F5] dark:border-[#1B3154] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white truncate">
                    {currentStaff?.fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentStaff?.roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logoutStaff}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl hover:bg-slate-50 dark:hover:bg-[#132645] cursor-pointer shrink-0"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Workspace */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-250 ease-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Contextual Workspace Header */}
        <header className="sticky top-0 z-10 h-16 bg-white/88 dark:bg-[#0B172B]/88 backdrop-blur-md border-b border-[#DCE7F5] dark:border-[#1B3154] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open staff menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                <span>Staff Console</span>
                <span aria-hidden="true">/</span>
                <span>{activeDept.name}</span>
                <span aria-hidden="true">/</span>
                <span className="text-[#0B1E3D] dark:text-white font-semibold">
                  {title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{scale: 0.94}}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#DCE7F5] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] text-slate-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-[#132645] transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{y: -1}}
              whileTap={{scale: 0.97}}
              onClick={() => togglePauseQueue(activeDept.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                activeDept.isPaused
                  ? 'bg-[#0F5CA8] dark:bg-sky-500 text-white dark:text-[#061229] hover:bg-[#0C4A88]'
                  : 'bg-white dark:bg-[#0E1C33] text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/70 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              {activeDept.isPaused ? (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Resume Queue</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4" />
                  <span>Pause Queue</span>
                </>
              )}
            </motion.button>
          </div>
        </header>

        {/* Active Pause / Disruption Advisory Strip (with gentle pulse on Urgent Emergency) */}
        <AnimatePresence>
          {(activeDept.isPaused ||
            activeDept.activeDelayMinutes > 0 ||
            activeDept.activeEmergencyMinutes > 0) && (
            <motion.div
              initial={{opacity: 0, y: -8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.2, ease: CLINICAL_EASE}}
              className={`px-4 sm:px-6 lg:px-8 py-3 border-b text-sm flex flex-wrap items-center justify-between gap-3 ${
                activeDept.activeEmergencyMinutes > 0
                  ? 'bg-red-50 dark:bg-red-950/45 border-red-200 dark:border-red-900/70 text-red-900 dark:text-red-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {activeDept.activeEmergencyMinutes > 0 ? (
                  <LivePulseIndicator variant="urgent" label="Urgent Emergency Offset" />
                ) : activeDept.isPaused ? (
                  <LivePulseIndicator variant="warning" label={`${activeDept.name} Queue Paused`} />
                ) : (
                  <LivePulseIndicator variant="warning" label="Active Doctor Delay" />
                )}
                <span className="text-xs sm:text-sm">
                  {activeDept.isPaused
                    ? activeDept.pauseReason || 'Temporarily paused by OPD staff.'
                    : activeDept.activeAdvisoryText}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                {activeDept.isPaused && (
                  <button
                    type="button"
                    onClick={() => togglePauseQueue(activeDept.id)}
                    className="underline hover:no-underline cursor-pointer"
                  >
                    Resume now
                  </button>
                )}
                {(activeDept.activeDelayMinutes > 0 ||
                  activeDept.activeEmergencyMinutes > 0) && (
                  <button
                    type="button"
                    onClick={() => setView('staff-delays')}
                    className="underline hover:no-underline cursor-pointer"
                  >
                    Manage delays
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -6}}
              transition={{duration: 0.2, ease: CLINICAL_EASE}}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {subtitle}
                </p>
              </div>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
