import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {createInitialSeed, STAFF_USERS} from '../data/seedData';
import {
  formatArrivalWindow,
  formatClockTime,
  normalizePhone,
  recalculateDepartmentQueue,
} from '../engine/queueEngine';
import {
  AppView,
  Department,
  EventType,
  QueueEvent,
  QueueToken,
  RegistrationInput,
  SmsCategory,
  SmsLog,
  SmsToast,
  StaffUser,
} from '../types/opd';

interface PersistedState {
  departments: Department[];
  tokens: QueueToken[];
  events: QueueEvent[];
  smsLogs: SmsLog[];
}

const STORAGE_KEY = 'smartopd_state_v2';

interface OpdContextValue {
  view: AppView;
  setView: (view: AppView) => void;
  departments: Department[];
  tokens: QueueToken[];
  events: QueueEvent[];
  smsLogs: SmsLog[];
  toasts: SmsToast[];
  dismissToast: (id: string) => void;
  selectedPatientTokenId: string | null;
  setSelectedPatientTokenId: (id: string | null) => void;
  preselectedDeptId: string | null;
  setPreselectedDeptId: (deptId: string | null) => void;
  currentStaff: StaffUser | null;
  activeStaffDeptId: string;
  setActiveStaffDeptId: (deptId: string) => void;
  // Patient actions
  registerPatient: (input: RegistrationInput) => QueueToken;
  lookupTokens: (query: string) => QueueToken[];
  // Auth actions
  loginStaff: (username: string, password: string) => {ok: boolean; error?: string};
  logoutStaff: () => void;
  // Staff operational actions
  callNextPatient: (deptId: string) => QueueToken | null;
  callSpecificPatient: (tokenId: string) => void;
  startConsultation: (tokenId: string) => void;
  completeConsultation: (tokenId: string, diagnosis: string, prescription: string) => void;
  markNoShow: (tokenId: string) => void;
  requeuePatient: (tokenId: string, targetPosition: number, reason: string) => void;
  togglePauseQueue: (deptId: string, reason?: string) => void;
  logDoctorDelay: (deptId: string, minutes: number, reason: string) => void;
  logEmergencyCase: (deptId: string, minutes: number, category: string, notes: string) => void;
  clearActiveOffset: (deptId: string) => void;
  sendManualBroadcast: (deptId: string, message: string) => number;
  resetDemoData: () => void;
  lastUpdatedAt: number;
}

const OpdContext = createContext<OpdContextValue | null>(null);

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed?.departments?.length && parsed?.tokens?.length) {
        // Recalculate times against current clock so arrival windows are always fresh
        let refreshedTokens = parsed.tokens;
        const now = Date.now();
        for (const dept of parsed.departments) {
          refreshedTokens = recalculateDepartmentQueue(dept, refreshedTokens, now);
        }
        return {
          ...parsed,
          tokens: refreshedTokens,
        };
      }
    }
  } catch {
    // Fallback to clean seed
  }
  return createInitialSeed(Date.now());
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const OpdProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [view, setViewState] = useState<AppView>('home');
  const [selectedPatientTokenId, setSelectedPatientTokenId] = useState<string | null>(
    'tok-card-104',
  );
  const [preselectedDeptId, setPreselectedDeptId] = useState<string | null>(null);
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);
  const [activeStaffDeptId, setActiveStaffDeptId] = useState<string>('dept-card');
  const [toasts, setToasts] = useState<SmsToast[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const setView = useCallback((nextView: AppView) => {
    setViewState(nextView);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToasts = useCallback((newToasts: SmsToast[]) => {
    if (!newToasts.length) return;
    // Show at most 2 toasts from a single broadcast so UI stays clean & legible
    const visibleBatch = newToasts.slice(0, 2);
    setToasts((prev) => [...visibleBatch, ...prev].slice(0, 3));
    visibleBatch.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 6500);
    });
  }, []);

  const createSmsEntries = (
    deptId: string,
    recipients: Array<{
      recipientName: string;
      phone: string;
      tokenNumber?: string;
      message: string;
    }>,
    category: SmsCategory,
    now: number,
  ): {logs: SmsLog[]; toasts: SmsToast[]} => {
    const logs: SmsLog[] = recipients.map((r) => ({
      id: makeId('sms'),
      departmentId: deptId,
      tokenNumber: r.tokenNumber,
      recipientName: r.recipientName,
      phone: r.phone,
      category,
      message: r.message,
      status: 'DISPATCHED',
      timestamp: now,
    }));
    const createdToasts: SmsToast[] = logs.map((l) => ({
      id: l.id,
      recipientName: l.recipientName,
      phone: l.phone,
      tokenNumber: l.tokenNumber,
      category: l.category,
      message: l.message,
    }));
    return {logs, toasts: createdToasts};
  };

  const makeEvent = (
    deptId: string,
    type: EventType,
    title: string,
    details: string,
    now: number,
    performedBy: string,
    extra?: {offsetMinutes?: number; tokenNumber?: string},
  ): QueueEvent => ({
    id: makeId('evt'),
    departmentId: deptId,
    type,
    title,
    details,
    performedBy,
    timestamp: now,
    ...extra,
  });

  const registerPatient = useCallback(
    (input: RegistrationInput): QueueToken => {
      const now = Date.now();
      const dept =
        state.departments.find((d) => d.id === input.departmentId) ??
        state.departments[0];
      const tokenNumber = `${dept.code}-${dept.nextSequence}`;
      const waitingCount = state.tokens.filter(
        (t) => t.departmentId === dept.id && t.status === 'WAITING',
      ).length;

      const cleanPhone = normalizePhone(input.phone);

      const draftToken: QueueToken = {
        id: makeId('tok'),
        tokenNumber,
        departmentId: dept.id,
        patientName: input.patientName.trim(),
        phone: cleanPhone,
        age: input.age,
        gender: input.gender,
        locality: input.locality.trim() || 'Local District',
        distanceKm: Math.max(0, input.distanceKm),
        visitReason: input.visitReason.trim() || 'General OPD Consultation',
        status: 'WAITING',
        queueOrder: waitingCount + 1,
        position: waitingCount + 1,
        patientsAhead: waitingCount,
        estimatedWaitMinutes: dept.avgConsultMinutes,
        estimatedConsultTimestamp: now,
        arrivalWindowStart: now,
        arrivalWindowEnd: now,
        registeredAt: now,
        requeueCount: 0,
      };

      const updatedDepartments = state.departments.map((d) =>
        d.id === dept.id ? {...d, nextSequence: d.nextSequence + 1} : d,
      );

      const recalculated = recalculateDepartmentQueue(
        dept,
        [...state.tokens, draftToken],
        now,
      );
      const createdToken = recalculated.find((t) => t.id === draftToken.id)!;

      const windowLabel = formatArrivalWindow(
        createdToken.arrivalWindowStart,
        createdToken.arrivalWindowEnd,
        createdToken.estimatedWaitMinutes,
      );

      const {logs, toasts: newToasts} = createSmsEntries(
        dept.id,
        [
          {
            recipientName: createdToken.patientName,
            phone: createdToken.phone,
            tokenNumber: createdToken.tokenNumber,
            message: `SmartOPD: Token ${createdToken.tokenNumber} confirmed for ${dept.name} (${dept.roomNumber}). Rank #${createdToken.position}, Est. consult ${formatClockTime(createdToken.estimatedConsultTimestamp)}. Arrival window: ${windowLabel}.`,
          },
        ],
        'TOKEN_CONFIRMED',
        now,
      );

      const evt = makeEvent(
        dept.id,
        'TOKEN_ISSUED',
        `Remote token ${createdToken.tokenNumber} issued`,
        `${createdToken.patientName} (${createdToken.locality}, ${createdToken.distanceKm} km) registered for ${dept.name}.`,
        now,
        'Patient Portal',
        {tokenNumber: createdToken.tokenNumber},
      );

      setState({
        departments: updatedDepartments,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      setSelectedPatientTokenId(createdToken.id);
      pushToasts(newToasts);
      return createdToken;
    },
    [state, pushToasts],
  );

  const lookupTokens = useCallback(
    (query: string): QueueToken[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const digitsOnly = q.replace(/\D/g, '');
      return state.tokens
        .filter((t) => {
          if (t.tokenNumber.toLowerCase() === q) return true;
          if (t.tokenNumber.toLowerCase().includes(q)) return true;
          const tokenDigits = t.phone.replace(/\D/g, '');
          if (digitsOnly.length >= 6 && tokenDigits.endsWith(digitsOnly)) return true;
          if (t.phone.toLowerCase() === q) return true;
          return false;
        })
        .sort((a, b) => b.registeredAt - a.registeredAt);
    },
    [state.tokens],
  );

  const loginStaff = useCallback(
    (username: string, password: string): {ok: boolean; error?: string} => {
      const match = STAFF_USERS.find(
        (u) =>
          u.username.toLowerCase() === username.trim().toLowerCase() &&
          u.password === password,
      );
      if (!match) {
        return {ok: false, error: 'Invalid staff username or password.'};
      }
      setCurrentStaff(match);
      if (match.departmentId) {
        setActiveStaffDeptId(match.departmentId);
      }
      setView('staff-dashboard');
      return {ok: true};
    },
    [setView],
  );

  const logoutStaff = useCallback(() => {
    setCurrentStaff(null);
    setView('home');
  }, [setView]);

  const callNextPatient = useCallback(
    (deptId: string): QueueToken | null => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return null;

      const nextWaiting = state.tokens
        .filter((t) => t.departmentId === deptId && t.status === 'WAITING')
        .sort((a, b) => a.queueOrder - b.queueOrder || a.registeredAt - b.registeredAt)[0];

      if (!nextWaiting) return null;

      const updatedTokens = state.tokens.map((t) =>
        t.id === nextWaiting.id ? {...t, status: 'CALLED' as const, calledAt: now} : t,
      );

      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);
      const calledToken = recalculated.find((t) => t.id === nextWaiting.id) ?? null;

      const {logs, toasts: newToasts} = createSmsEntries(
        dept.id,
        [
          {
            recipientName: nextWaiting.patientName,
            phone: nextWaiting.phone,
            tokenNumber: nextWaiting.tokenNumber,
            message: `SmartOPD Your Turn: Token ${nextWaiting.tokenNumber} is now CALLED to ${dept.name} (${dept.roomNumber}, ${dept.doctorName}). Please report immediately.`,
          },
        ],
        'YOUR_TURN',
        now,
      );

      const evt = makeEvent(
        dept.id,
        'PATIENT_CALLED',
        `Called ${nextWaiting.tokenNumber} (${nextWaiting.patientName})`,
        `Patient called to ${dept.roomNumber}. Remaining waiting queue recalculated.`,
        now,
        actor,
        {tokenNumber: nextWaiting.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
      return calledToken;
    },
    [state, currentStaff, pushToasts],
  );

  const callSpecificPatient = useCallback(
    (tokenId: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const target = state.tokens.find((t) => t.id === tokenId);
      if (!target) return;
      const dept = state.departments.find((d) => d.id === target.departmentId)!;

      const updatedTokens = state.tokens.map((t) =>
        t.id === tokenId ? {...t, status: 'CALLED' as const, calledAt: now} : t,
      );
      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);

      const {logs, toasts: newToasts} = createSmsEntries(
        dept.id,
        [
          {
            recipientName: target.patientName,
            phone: target.phone,
            tokenNumber: target.tokenNumber,
            message: `SmartOPD Your Turn: Token ${target.tokenNumber} is now CALLED to ${dept.name} (${dept.roomNumber}, ${dept.doctorName}). Please report immediately.`,
          },
        ],
        'YOUR_TURN',
        now,
      );

      const evt = makeEvent(
        dept.id,
        'PATIENT_CALLED',
        `Called ${target.tokenNumber} (${target.patientName})`,
        `Direct call to ${dept.roomNumber} by ${actor}.`,
        now,
        actor,
        {tokenNumber: target.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const startConsultation = useCallback(
    (tokenId: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const target = state.tokens.find((t) => t.id === tokenId);
      if (!target) return;
      const dept = state.departments.find((d) => d.id === target.departmentId)!;

      const updatedTokens = state.tokens.map((t) => {
        if (t.id === tokenId) {
          return {...t, status: 'IN_CONSULTATION' as const, startedAt: now};
        }
        if (t.departmentId === dept.id && t.status === 'IN_CONSULTATION') {
          return {
            ...t,
            status: 'COMPLETED' as const,
            completedAt: now,
            diagnosis: t.diagnosis || 'OPD consultation concluded',
            prescription: t.prescription || 'Advised follow-up as scheduled',
          };
        }
        return t;
      });

      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);

      const evt = makeEvent(
        dept.id,
        'CONSULTATION_STARTED',
        `Consultation started for ${target.tokenNumber}`,
        `${target.patientName} is now with ${dept.doctorName} in ${dept.roomNumber}.`,
        now,
        actor,
        {tokenNumber: target.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
      });

      setLastUpdatedAt(now);
    },
    [state, currentStaff],
  );

  const completeConsultation = useCallback(
    (tokenId: string, diagnosis: string, prescription: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Doctor';
      const target = state.tokens.find((t) => t.id === tokenId);
      if (!target) return;
      const dept = state.departments.find((d) => d.id === target.departmentId)!;

      const updatedTokens = state.tokens.map((t) =>
        t.id === tokenId
          ? {
              ...t,
              status: 'COMPLETED' as const,
              completedAt: now,
              diagnosis: diagnosis.trim() || 'Clinical examination completed',
              prescription:
                prescription.trim() || 'Standard OPD medication dispensed',
            }
          : t,
      );

      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);

      const evt = makeEvent(
        dept.id,
        'CONSULTATION_COMPLETED',
        `Completed ${target.tokenNumber} (${target.patientName})`,
        `Diagnosis recorded: ${diagnosis.trim() || 'Clinical examination completed'}.`,
        now,
        actor,
        {tokenNumber: target.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
      });

      setLastUpdatedAt(now);
    },
    [state, currentStaff],
  );

  const markNoShow = useCallback(
    (tokenId: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const target = state.tokens.find((t) => t.id === tokenId);
      if (!target) return;
      const dept = state.departments.find((d) => d.id === target.departmentId)!;

      const updatedTokens = state.tokens.map((t) =>
        t.id === tokenId ? {...t, status: 'NO_SHOW' as const} : t,
      );

      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);

      const {logs, toasts: newToasts} = createSmsEntries(
        dept.id,
        [
          {
            recipientName: target.patientName,
            phone: target.phone,
            tokenNumber: target.tokenNumber,
            message: `SmartOPD: Token ${target.tokenNumber} was marked absent (No-Show) at ${dept.name}. Contact the OPD reception desk if you arrive late for authorized requeue.`,
          },
        ],
        'QUEUE_STATUS',
        now,
      );

      const evt = makeEvent(
        dept.id,
        'NO_SHOW_MARKED',
        `Marked ${target.tokenNumber} as No-Show`,
        `${target.patientName} removed from active queue. Subsequent patients advanced 1 position.`,
        now,
        actor,
        {tokenNumber: target.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const requeuePatient = useCallback(
    (tokenId: string, targetPosition: number, reason: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const target = state.tokens.find((t) => t.id === tokenId);
      if (!target) return;
      const dept = state.departments.find((d) => d.id === target.departmentId)!;

      const currentWaiting = state.tokens
        .filter(
          (t) =>
            t.departmentId === dept.id &&
            t.status === 'WAITING' &&
            t.id !== tokenId,
        )
        .sort((a, b) => a.queueOrder - b.queueOrder || a.registeredAt - b.registeredAt);

      const clampedIndex = Math.max(
        0,
        Math.min(targetPosition - 1, currentWaiting.length),
      );

      const reorderedIds = currentWaiting.map((w) => w.id);
      reorderedIds.splice(clampedIndex, 0, tokenId);

      const orderMap = new Map<string, number>();
      reorderedIds.forEach((id, idx) => orderMap.set(id, idx + 1));

      const updatedTokens = state.tokens.map((t) => {
        if (t.id === tokenId) {
          return {
            ...t,
            status: 'WAITING' as const,
            queueOrder: orderMap.get(t.id) ?? 1,
            requeueCount: t.requeueCount + 1,
          };
        }
        if (orderMap.has(t.id)) {
          return {...t, queueOrder: orderMap.get(t.id)!};
        }
        return t;
      });

      const recalculated = recalculateDepartmentQueue(dept, updatedTokens, now);
      const updatedTarget = recalculated.find((t) => t.id === tokenId)!;

      const {logs, toasts: newToasts} = createSmsEntries(
        dept.id,
        [
          {
            recipientName: updatedTarget.patientName,
            phone: updatedTarget.phone,
            tokenNumber: updatedTarget.tokenNumber,
            message: `SmartOPD Re-admitted: Token ${updatedTarget.tokenNumber} has been requeued in ${dept.name} at Position #${updatedTarget.position}. New est. consult: ${formatClockTime(updatedTarget.estimatedConsultTimestamp)}.`,
          },
        ],
        'REQUEUED',
        now,
      );

      const evt = makeEvent(
        dept.id,
        'PATIENT_REQUEUED',
        `Requeued ${updatedTarget.tokenNumber} at Position #${updatedTarget.position}`,
        `${updatedTarget.patientName} re-admitted (${reason.trim() || 'Late arrival approved'}). Queue recalculated.`,
        now,
        actor,
        {tokenNumber: updatedTarget.tokenNumber},
      );

      setState({
        ...state,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const togglePauseQueue = useCallback(
    (deptId: string, reason?: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return;

      const willPause = !dept.isPaused;
      const updatedDept: Department = {
        ...dept,
        isPaused: willPause,
        pauseReason: willPause
          ? reason?.trim() || 'Short clinical break / ward coordination'
          : undefined,
      };

      const updatedDepartments = state.departments.map((d) =>
        d.id === deptId ? updatedDept : d,
      );

      const recalculated = recalculateDepartmentQueue(updatedDept, state.tokens, now);
      const affectedWaiting = recalculated.filter(
        (t) =>
          t.departmentId === deptId &&
          (t.status === 'WAITING' || t.status === 'CALLED'),
      );

      const {logs, toasts: newToasts} = createSmsEntries(
        deptId,
        affectedWaiting.map((t) => ({
          recipientName: t.patientName,
          phone: t.phone,
          tokenNumber: t.tokenNumber,
          message: willPause
            ? `SmartOPD Notice: ${dept.name} OPD queue is temporarily paused (${updatedDept.pauseReason}). Please wait for the resume alert before proceeding.`
            : `SmartOPD Update: ${dept.name} OPD queue has resumed. Token ${t.tokenNumber} est. consultation is ${formatClockTime(t.estimatedConsultTimestamp)}.`,
        })),
        'QUEUE_STATUS',
        now,
      );

      const evt = makeEvent(
        deptId,
        willPause ? 'QUEUE_PAUSED' : 'QUEUE_RESUMED',
        willPause ? `${dept.name} OPD queue paused` : `${dept.name} OPD queue resumed`,
        willPause
          ? `Queue paused (${updatedDept.pauseReason}). ${affectedWaiting.length} waiting patients alerted.`
          : `Normal queue progression restored for ${dept.name}.`,
        now,
        actor,
      );

      setState({
        departments: updatedDepartments,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const logDoctorDelay = useCallback(
    (deptId: string, minutes: number, reason: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return;

      const updatedDept: Department = {
        ...dept,
        activeDelayMinutes: dept.activeDelayMinutes + minutes,
        activeAdvisoryText: `${reason.trim() || 'Doctor attending inpatient rounds'} (+${dept.activeDelayMinutes + minutes} min)`,
        activeAdvisoryType: 'DELAY',
      };

      const updatedDepartments = state.departments.map((d) =>
        d.id === deptId ? updatedDept : d,
      );
      const recalculated = recalculateDepartmentQueue(updatedDept, state.tokens, now);

      const affectedWaiting = recalculated.filter(
        (t) =>
          t.departmentId === deptId &&
          (t.status === 'WAITING' || t.status === 'CALLED'),
      );

      const {logs, toasts: newToasts} = createSmsEntries(
        deptId,
        affectedWaiting.map((t) => ({
          recipientName: t.patientName,
          phone: t.phone,
          tokenNumber: t.tokenNumber,
          message: `SmartOPD Delay Alert: ${dept.name} (${dept.doctorName}) is delayed by ${minutes} min (${reason.trim() || 'Inpatient rounds'}). Token ${t.tokenNumber} new arrival window: ${formatArrivalWindow(t.arrivalWindowStart, t.arrivalWindowEnd, t.estimatedWaitMinutes)}.`,
        })),
        'DELAY_NOTICE',
        now,
      );

      const evt = makeEvent(
        deptId,
        'DOCTOR_DELAY',
        `Doctor delay (+${minutes} min) logged`,
        `${reason.trim() || 'Attending inpatient rounds'}. ${affectedWaiting.length} waiting tokens shifted forward and notified via SMS.`,
        now,
        actor,
        {offsetMinutes: minutes},
      );

      setState({
        departments: updatedDepartments,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const logEmergencyCase = useCallback(
    (deptId: string, minutes: number, category: string, notes: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return;

      const updatedDept: Department = {
        ...dept,
        activeEmergencyMinutes: dept.activeEmergencyMinutes + minutes,
        activeAdvisoryText: `Emergency interruption: ${category} (+${dept.activeEmergencyMinutes + minutes} min)`,
        activeAdvisoryType: 'EMERGENCY',
      };

      const updatedDepartments = state.departments.map((d) =>
        d.id === deptId ? updatedDept : d,
      );
      const recalculated = recalculateDepartmentQueue(updatedDept, state.tokens, now);

      const affectedWaiting = recalculated.filter(
        (t) =>
          t.departmentId === deptId &&
          (t.status === 'WAITING' || t.status === 'CALLED'),
      );

      const {logs, toasts: newToasts} = createSmsEntries(
        deptId,
        affectedWaiting.map((t) => ({
          recipientName: t.patientName,
          phone: t.phone,
          tokenNumber: t.tokenNumber,
          message: `URGENT SmartOPD Broadcast: Emergency case (${category}) in ${dept.name}. Queue postponed by ${minutes} min. Token ${t.tokenNumber} revised arrival window: ${formatArrivalWindow(t.arrivalWindowStart, t.arrivalWindowEnd, t.estimatedWaitMinutes)}.`,
        })),
        'EMERGENCY_ALERT',
        now,
      );

      const evt = makeEvent(
        deptId,
        'EMERGENCY_CASE',
        `Emergency case (+${minutes} min) — ${category}`,
        `${notes.trim() || 'Priority emergency clinical intervention required.'} Urgent SMS broadcast sent to ${affectedWaiting.length} waiting patients.`,
        now,
        actor,
        {offsetMinutes: minutes},
      );

      setState({
        departments: updatedDepartments,
        tokens: recalculated,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
    },
    [state, currentStaff, pushToasts],
  );

  const clearActiveOffset = useCallback(
    (deptId: string) => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return;

      const updatedDept: Department = {
        ...dept,
        activeDelayMinutes: 0,
        activeEmergencyMinutes: 0,
        activeAdvisoryText: undefined,
        activeAdvisoryType: undefined,
      };

      const updatedDepartments = state.departments.map((d) =>
        d.id === deptId ? updatedDept : d,
      );
      const recalculated = recalculateDepartmentQueue(updatedDept, state.tokens, now);

      const evt = makeEvent(
        deptId,
        'DELAY_CLEARED',
        `Schedule normalized for ${dept.name}`,
        `Active delay/emergency offsets cleared. Queue arrival windows recalculated to baseline pace.`,
        now,
        actor,
      );

      setState({
        ...state,
        departments: updatedDepartments,
        tokens: recalculated,
        events: [evt, ...state.events],
      });

      setLastUpdatedAt(now);
    },
    [state, currentStaff],
  );

  const sendManualBroadcast = useCallback(
    (deptId: string, message: string): number => {
      const now = Date.now();
      const actor = currentStaff?.fullName ?? 'OPD Staff';
      const dept = state.departments.find((d) => d.id === deptId);
      if (!dept) return 0;

      const waiting = state.tokens.filter(
        (t) =>
          t.departmentId === deptId &&
          (t.status === 'WAITING' || t.status === 'CALLED'),
      );
      if (!waiting.length) return 0;

      const {logs, toasts: newToasts} = createSmsEntries(
        deptId,
        waiting.map((t) => ({
          recipientName: t.patientName,
          phone: t.phone,
          tokenNumber: t.tokenNumber,
          message: `SmartOPD (${dept.name}): ${message.trim()}`,
        })),
        'BROADCAST',
        now,
      );

      const evt = makeEvent(
        deptId,
        'MANUAL_BROADCAST',
        `Broadcast SMS sent to ${waiting.length} waiting patients`,
        message.trim(),
        now,
        actor,
      );

      setState({
        ...state,
        events: [evt, ...state.events],
        smsLogs: [...logs, ...state.smsLogs],
      });

      setLastUpdatedAt(now);
      pushToasts(newToasts);
      return waiting.length;
    },
    [state, currentStaff, pushToasts],
  );

  const resetDemoData = useCallback(() => {
    const fresh = createInitialSeed(Date.now());
    setState(fresh);
    setSelectedPatientTokenId('tok-card-104');
    setLastUpdatedAt(Date.now());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <OpdContext.Provider
      value={{
        view,
        setView,
        departments: state.departments,
        tokens: state.tokens,
        events: state.events,
        smsLogs: state.smsLogs,
        toasts,
        dismissToast,
        selectedPatientTokenId,
        setSelectedPatientTokenId,
        preselectedDeptId,
        setPreselectedDeptId,
        currentStaff,
        activeStaffDeptId,
        setActiveStaffDeptId,
        registerPatient,
        lookupTokens,
        loginStaff,
        logoutStaff,
        callNextPatient,
        callSpecificPatient,
        startConsultation,
        completeConsultation,
        markNoShow,
        requeuePatient,
        togglePauseQueue,
        logDoctorDelay,
        logEmergencyCase,
        clearActiveOffset,
        sendManualBroadcast,
        resetDemoData,
        lastUpdatedAt,
      }}
    >
      {children}
    </OpdContext.Provider>
  );
};

export function useOpd(): OpdContextValue {
  const ctx = useContext(OpdContext);
  if (!ctx) throw new Error('useOpd must be used within OpdProvider');
  return ctx;
}
