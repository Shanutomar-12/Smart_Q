import React, {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';

export const CLINICAL_EASE = [0.16, 1, 0.3, 1] as const;

export const PageTransition: React.FC<{
  viewKey: string;
  children: React.ReactNode;
}> = ({viewKey, children}) => (
  <motion.div
    key={viewKey}
    initial={{opacity: 0, y: 10}}
    animate={{opacity: 1, y: 0}}
    exit={{opacity: 0, y: -6}}
    transition={{duration: 0.24, ease: CLINICAL_EASE}}
  >
    {children}
  </motion.div>
);

export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({children, className, delay = 0}) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.055,
          delayChildren: delay,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({children, className}) => (
  <motion.div
    variants={{
      hidden: {opacity: 0, y: 14},
      show: {
        opacity: 1,
        y: 0,
        transition: {duration: 0.32, ease: CLINICAL_EASE},
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const ScrollReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({children, className, delay = 0}) => (
  <motion.div
    initial={{opacity: 0, y: 16}}
    whileInView={{opacity: 1, y: 0}}
    viewport={{once: true, amount: 0.12}}
    transition={{duration: 0.36, delay, ease: CLINICAL_EASE}}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * Animated Count-Up Number for KPI counters & stats (60fps rAF, honors reduced motion)
 */
export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({value, prefix = '', suffix = '', className}) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const to = value;
    const duration = 520;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, prefersReduced]);

  return (
    <span className={`font-mono tabular-nums ${className ?? ''}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

/**
 * Subtle Healthcare ECG / Heartbeat Line SVG animation
 */
export const EcgPulseLine: React.FC<{
  className?: string;
  strokeClassName?: string;
}> = ({className = 'w-full h-10', strokeClassName = 'stroke-[#0D9488] dark:stroke-teal-400'}) => {
  const prefersReduced = useReducedMotion();
  const path =
    'M 0 22 L 42 22 L 52 22 L 58 14 L 64 28 L 71 4 L 79 36 L 86 18 L 93 22 L 152 22 L 160 15 L 166 27 L 173 6 L 180 34 L 187 19 L 194 22 L 260 22';

  return (
    <svg
      viewBox="0 0 260 42"
      fill="none"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-sky-200/60 dark:stroke-sky-900/60"
      />
      <motion.path
        d={path}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
        initial={prefersReduced ? {pathLength: 1, opacity: 1} : {pathLength: 0, opacity: 0.4}}
        animate={
          prefersReduced
            ? {pathLength: 1, opacity: 1}
            : {pathLength: [0, 1, 1], opacity: [0.35, 1, 0.35]}
        }
        transition={{
          duration: 3.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </svg>
  );
};

/**
 * Animated Circular Progress Ring for clinical metrics & queue progress
 */
export const ProgressRing: React.FC<{
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  trackClass?: string;
  indicatorClass?: string;
}> = ({
  progress,
  size = 96,
  strokeWidth = 8,
  label,
  sublabel,
  trackClass = 'stroke-sky-100 dark:stroke-slate-800',
  indicatorClass = 'stroke-[#0F5CA8] dark:stroke-sky-400',
}) => {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{width: size, height: size}}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClass}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{strokeDashoffset: circumference}}
          animate={{strokeDashoffset: dashOffset}}
          transition={{duration: 0.7, ease: CLINICAL_EASE}}
          className={indicatorClass}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && (
            <span className="font-mono tabular-nums text-base font-bold text-[#0B1E3D] dark:text-white leading-none">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Live Clinical Indicator with soft requested pulse (strictly for real live doctor/urgent states)
 */
export const LivePulseIndicator: React.FC<{
  variant?: 'online' | 'urgent' | 'warning';
  label: string;
}> = ({variant = 'online', label}) => {
  const prefersReduced = useReducedMotion();
  const colors =
    variant === 'urgent'
      ? {
          ring: 'bg-red-500/35',
          dot: 'bg-red-600 dark:bg-red-400',
          text: 'text-red-700 dark:text-red-300',
        }
      : variant === 'warning'
        ? {
            ring: 'bg-amber-500/35',
            dot: 'bg-amber-500 dark:bg-amber-400',
            text: 'text-amber-700 dark:text-amber-300',
          }
        : {
            ring: 'bg-emerald-500/35',
            dot: 'bg-emerald-600 dark:bg-emerald-400',
            text: 'text-emerald-700 dark:text-emerald-300',
          };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colors.text}`}>
      <span className="relative inline-flex h-2 w-2 shrink-0">
        {!prefersReduced && (
          <motion.span
            animate={{scale: [1, 2.1], opacity: [0.65, 0]}}
            transition={{duration: 1.8, repeat: Infinity, ease: 'easeOut'}}
            className={`absolute inset-0 rounded-full ${colors.ring}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${colors.dot}`} />
      </span>
      <span>{label}</span>
    </span>
  );
};

/**
 * Animated Checkmark SVG for form / modal success
 */
export const AnimatedCheckmark: React.FC<{className?: string}> = ({
  className = 'w-6 h-6 text-teal-200',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      initial={{pathLength: 0, opacity: 0}}
      animate={{pathLength: 1, opacity: 1}}
      transition={{duration: 0.36, ease: CLINICAL_EASE}}
    />
    <motion.path
      d="M8 12.5L10.8 15.3L16.5 9.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{pathLength: 0}}
      animate={{pathLength: 1}}
      transition={{duration: 0.3, delay: 0.2, ease: CLINICAL_EASE}}
    />
  </svg>
);

/**
 * Inline Validation Shake Wrapper
 */
export const ShakeContainer: React.FC<{
  shakeKey: number;
  children: React.ReactNode;
}> = ({shakeKey, children}) => (
  <motion.div
    key={shakeKey}
    initial={shakeKey > 0 ? {x: 0} : false}
    animate={shakeKey > 0 ? {x: [0, -7, 7, -5, 5, -2, 0]} : {x: 0}}
    transition={{duration: 0.38, ease: 'easeInOut'}}
  >
    {children}
  </motion.div>
);

/**
 * Friendly Floating Illustrated Empty State
 */
export const FloatingEmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({title, description, actionLabel, onAction}) => {
  const prefersReduced = useReducedMotion();

  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3">
      <motion.div
        animate={prefersReduced ? undefined : {y: [0, -6, 0]}}
        transition={{duration: 3.2, repeat: Infinity, ease: 'easeInOut'}}
        className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/70 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="w-9 h-9 text-[#0F5CA8] dark:text-sky-400"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="8"
            width="30"
            height="34"
            rx="5"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="M17 8V6.5C17 5.67 17.67 5 18.5 5H29.5C30.33 5 31 5.67 31 6.5V8"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="M16 21H21L23.5 16L26.5 26L29 21H32"
            stroke="#0D9488"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 32H32"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        </svg>
      </motion.div>
      <div className="space-y-1 max-w-sm">
        <p className="text-base font-bold text-[#0B1E3D] dark:text-white">
          {title}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <motion.button
          type="button"
          whileHover={{y: -1}}
          whileTap={{scale: 0.97}}
          onClick={onAction}
          className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F5CA8] rounded-xl hover:bg-[#0C4A88] cursor-pointer"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
};

/**
 * Skeleton Shimmer Rows Loader
 */
export const SkeletonRows: React.FC<{count?: number}> = ({count = 3}) => (
  <div className="p-5 space-y-3" aria-busy="true" aria-label="Loading queue records">
    {Array.from({length: count}).map((_, idx) => (
      <div key={idx} className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-4 w-20 rounded-md skeleton-shimmer" />
          <div className="h-4 w-44 rounded-md skeleton-shimmer" />
        </div>
        <div className="h-4 w-24 rounded-md skeleton-shimmer" />
      </div>
    ))}
  </div>
);

/**
 * Spring-Based Glass Modal with Fading Backdrop
 */
export const AnimatedModal: React.FC<{
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({open, onClose, ariaLabelledBy, maxWidthClass = 'max-w-lg', children}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.18, ease: 'easeOut'}}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061229]/60 backdrop-blur-[4px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{opacity: 0, scale: 0.95, y: 14}}
          animate={{opacity: 1, scale: 1, y: 0}}
          exit={{opacity: 0, scale: 0.97, y: 8}}
          transition={{type: 'spring', stiffness: 380, damping: 30}}
          className={`w-full ${maxWidthClass} bg-white dark:bg-[#0E1C33] border border-[#DCE7F5] dark:border-[#1B3154] rounded-2xl shadow-2xl overflow-hidden`}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
