import React, {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Menu, Moon, Sun, X} from 'lucide-react';
import {useOpd} from '../context/OpdContext';
import {useTheme} from '../context/ThemeContext';
import {AppView} from '../types/opd';
import {CLINICAL_EASE} from './MotionPrimitives';

const PUBLIC_LINKS: Array<{label: string; view: AppView}> = [
  {label: 'Overview', view: 'home'},
  {label: 'Book Token', view: 'register'},
  {label: 'Track Token', view: 'track'},
  {label: 'Live Board', view: 'public-board'},
];

export const PublicNavbar: React.FC = () => {
  const {view, setView, currentStaff} = useOpd();
  const {theme, toggleTheme} = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isBoard = view === 'public-board';

  const handleNavigate = (target: AppView) => {
    setView(target);
    setMobileOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
        isBoard
          ? 'bg-[#060E1F]/90 border-[#1B3158] text-white backdrop-blur-md'
          : 'bg-white/88 dark:bg-[#0B172B]/88 border-[#DCE7F5] dark:border-[#1B3154] text-[#0B172A] dark:text-slate-100 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <motion.button
          type="button"
          whileHover={{opacity: 0.85}}
          whileTap={{scale: 0.97}}
          onClick={() => handleNavigate('home')}
          className={`font-display text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 cursor-pointer ${
            isBoard ? 'text-white' : 'text-[#0B1E3D] dark:text-white'
          }`}
        >
          Smart
          <span className={isBoard ? 'text-sky-400' : 'text-[#0F5CA8] dark:text-sky-400'}>
            OPD
          </span>
        </motion.button>

        {/* Zone 2: 4 concise single-line nav links with sliding layoutId underline */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium"
        >
          {PUBLIC_LINKS.map((item) => {
            const isActive =
              view === item.view ||
              (item.view === 'track' && view === 'patient-dashboard');
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNavigate(item.view)}
                className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  isBoard
                    ? isActive
                      ? 'text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                    : isActive
                      ? 'text-[#0F5CA8] dark:text-sky-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1E3D] dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="public-nav-underline"
                    transition={{type: 'spring', stiffness: 460, damping: 36}}
                    className={`absolute left-0 right-0 -bottom-[21px] h-[2.5px] rounded-full ${
                      isBoard ? 'bg-sky-400' : 'bg-[#0F5CA8] dark:bg-sky-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + 1 Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!isBoard && (
            <motion.button
              type="button"
              whileTap={{scale: 0.94}}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#DCE7F5] dark:border-[#1B3154] bg-white/80 dark:bg-[#0E1C33] text-slate-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-[#152847] transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={{y: -1}}
            whileTap={{scale: 0.97}}
            transition={{duration: 0.14}}
            onClick={() =>
              handleNavigate(currentStaff ? 'staff-dashboard' : 'staff-login')
            }
            className={`hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              isBoard
                ? 'bg-sky-400 text-[#061229] hover:bg-sky-300'
                : 'bg-[#0F5CA8] dark:bg-sky-500 text-white dark:text-[#061229] hover:bg-[#0C4A88] dark:hover:bg-sky-400 shadow-sm shadow-blue-900/15'
            }`}
          >
            {currentStaff ? 'Open Console' : 'Staff Console'}
          </motion.button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer ${
              isBoard
                ? 'text-slate-200 hover:bg-slate-800'
                : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-[#152847]'
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Animated Mobile Slide-in Navigation Drawer with Backdrop Blur */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 top-16 z-40 md:hidden">
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.18}}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 top-16 bg-[#061229]/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{opacity: 0, y: -12}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -12}}
              transition={{duration: 0.22, ease: CLINICAL_EASE}}
              className={`relative border-b px-4 py-4 space-y-1 shadow-xl ${
                isBoard
                  ? 'bg-[#060E1F] border-[#1B3158]'
                  : 'bg-white dark:bg-[#0B172B] border-[#DCE7F5] dark:border-[#1B3154]'
              }`}
            >
              {PUBLIC_LINKS.map((item) => {
                const isActive =
                  view === item.view ||
                  (item.view === 'track' && view === 'patient-dashboard');
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => handleNavigate(item.view)}
                    className={`block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                      isBoard
                        ? isActive
                          ? 'bg-[#132548] text-sky-300'
                          : 'text-slate-300 hover:bg-[#0D1B35]'
                        : isActive
                          ? 'bg-sky-50 dark:bg-[#132645] text-[#0F5CA8] dark:text-sky-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#10213D]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleNavigate(currentStaff ? 'staff-dashboard' : 'staff-login')
                  }
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#0F5CA8] dark:bg-sky-500 text-white dark:text-[#061229] hover:bg-[#0C4A88] cursor-pointer"
                >
                  {currentStaff ? 'Open Staff Console' : 'Staff Console'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
