import React from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {MessageSquare, X} from 'lucide-react';
import {useOpd} from '../context/OpdContext';
import {SmsCategory} from '../types/opd';
import {CLINICAL_EASE} from './MotionPrimitives';

const CATEGORY_LABELS: Record<SmsCategory, string> = {
  TOKEN_CONFIRMED: 'SMS · Token Confirmed',
  YOUR_TURN: 'SMS · Your Turn',
  DELAY_NOTICE: 'SMS · Delay Advisory',
  EMERGENCY_ALERT: 'SMS · Urgent Emergency',
  QUEUE_STATUS: 'SMS · Queue Update',
  REQUEUED: 'SMS · Re-admitted',
  BROADCAST: 'SMS · Department Notice',
};

export const SmsToastStack: React.FC = () => {
  const {toasts, dismissToast} = useOpd();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isUrgent = toast.category === 'EMERGENCY_ALERT';
          const isTurn = toast.category === 'YOUR_TURN';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{opacity: 0, x: 32, scale: 0.96}}
              animate={{opacity: 1, x: 0, scale: 1}}
              exit={{opacity: 0, x: 24, scale: 0.96}}
              transition={{duration: 0.24, ease: CLINICAL_EASE}}
              className={`pointer-events-auto rounded-2xl border clinical-glass p-4 shadow-xl shadow-blue-950/15 ${
                isUrgent
                  ? 'border-red-300 dark:border-red-700/70'
                  : isTurn
                    ? 'border-[#0D9488]/50 dark:border-teal-500/50'
                    : 'border-[#DCE7F5] dark:border-[#1B3154]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 ${
                      isUrgent
                        ? 'text-red-700 dark:text-red-400'
                        : isTurn
                          ? 'text-[#0D9488] dark:text-teal-400'
                          : 'text-[#0F5CA8] dark:text-sky-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold truncate ${
                      isUrgent
                        ? 'text-red-700 dark:text-red-400'
                        : isTurn
                          ? 'text-[#0D9488] dark:text-teal-400'
                          : 'text-[#0B1E3D] dark:text-white'
                    }`}
                  >
                    {CATEGORY_LABELS[toast.category]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss SMS notification"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-200">
                  {toast.recipientName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{toast.phone}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {toast.message}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
