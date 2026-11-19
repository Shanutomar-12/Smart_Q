import {Department, QueueToken} from '../types/opd';

const MINUTE_MS = 60 * 1000;

/**
 * Deterministic Dynamic OPD Queue Engine
 * Mirrors com.smartopd.engine.DynamicQueueEngine:
 * Recalculates queue rank, patients ahead, estimated wait time,
 * estimated consultation timestamp, and personalized arrival windows
 * whenever any operational trigger occurs (registration, call next,
 * doctor delay, emergency interruption, no-show, requeue, pause/resume).
 */
export function recalculateDepartmentQueue(
  department: Department,
  allTokens: QueueToken[],
  nowTimestamp: number = Date.now(),
): QueueToken[] {
  const deptTokens = allTokens.filter((t) => t.departmentId === department.id);
  const otherTokens = allTokens.filter((t) => t.departmentId !== department.id);

  const inConsultation = deptTokens.find((t) => t.status === 'IN_CONSULTATION');
  const calledTokens = deptTokens.filter((t) => t.status === 'CALLED');
  const waitingTokens = deptTokens
    .filter((t) => t.status === 'WAITING')
    .sort((a, b) => a.queueOrder - b.queueOrder || a.registeredAt - b.registeredAt);

  // Remaining consultation estimate for active patient in room
  const remainingCurrentConsultMin = inConsultation
    ? Math.max(4, Math.round(department.avgConsultMinutes * 0.5))
    : 0;

  // Total operational offset from delays, emergencies, and pause buffer
  const pauseBufferMin = department.isPaused ? 15 : 0;
  const totalOffsetMin =
    department.activeDelayMinutes + department.activeEmergencyMinutes + pauseBufferMin;

  const updatedDeptTokens: QueueToken[] = deptTokens.map((token) => {
    if (token.status === 'COMPLETED' || token.status === 'NO_SHOW') {
      return {
        ...token,
        position: null,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
      };
    }

    if (token.status === 'IN_CONSULTATION') {
      return {
        ...token,
        position: 0,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
        estimatedConsultTimestamp: token.startedAt ?? nowTimestamp,
        arrivalWindowStart: token.startedAt ?? nowTimestamp,
        arrivalWindowEnd: token.startedAt ?? nowTimestamp,
      };
    }

    if (token.status === 'CALLED') {
      const waitMin = Math.max(2, totalOffsetMin > 0 ? totalOffsetMin : 2);
      const consultTs = nowTimestamp + waitMin * MINUTE_MS;
      return {
        ...token,
        position: 0,
        patientsAhead: inConsultation ? 1 : 0,
        estimatedWaitMinutes: waitMin,
        estimatedConsultTimestamp: consultTs,
        arrivalWindowStart: nowTimestamp,
        arrivalWindowEnd: consultTs,
      };
    }

    // WAITING status
    const waitingIndex = waitingTokens.findIndex((w) => w.id === token.id);
    const rank = waitingIndex + 1; // 1-based queue rank
    const patientsAhead = calledTokens.length + waitingIndex;

    const estimatedWaitMinutes =
      remainingCurrentConsultMin +
      totalOffsetMin +
      patientsAhead * department.avgConsultMinutes +
      (inConsultation || calledTokens.length > 0 ? 0 : department.avgConsultMinutes);

    const safeWait = Math.max(department.avgConsultMinutes, estimatedWaitMinutes);
    const estimatedConsultTimestamp = nowTimestamp + safeWait * MINUTE_MS;

    // Recommended Hospital Arrival Window:
    // Arrive 15–20 minutes prior to estimated consultation (15-min bracket)
    const rawWindowStart = estimatedConsultTimestamp - 20 * MINUTE_MS;
    const rawWindowEnd = estimatedConsultTimestamp - 5 * MINUTE_MS;
    const arrivalWindowStart = Math.max(nowTimestamp, rawWindowStart);
    const arrivalWindowEnd = Math.max(arrivalWindowStart + 10 * MINUTE_MS, rawWindowEnd);

    return {
      ...token,
      queueOrder: rank,
      position: rank,
      patientsAhead,
      estimatedWaitMinutes: safeWait,
      estimatedConsultTimestamp,
      arrivalWindowStart,
      arrivalWindowEnd,
    };
  });

  return [...otherTokens, ...updatedDeptTokens];
}

export function previewNewTokenEstimate(
  department: Department,
  allTokens: QueueToken[],
  nowTimestamp: number = Date.now(),
): {
  nextTokenNumber: string;
  position: number;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  estimatedConsultTimestamp: number;
  arrivalWindowStart: number;
  arrivalWindowEnd: number;
} {
  const deptTokens = allTokens.filter((t) => t.departmentId === department.id);
  const inConsultation = deptTokens.some((t) => t.status === 'IN_CONSULTATION');
  const calledCount = deptTokens.filter((t) => t.status === 'CALLED').length;
  const waitingCount = deptTokens.filter((t) => t.status === 'WAITING').length;

  const remainingCurrentConsultMin = inConsultation
    ? Math.max(4, Math.round(department.avgConsultMinutes * 0.5))
    : 0;
  const pauseBufferMin = department.isPaused ? 15 : 0;
  const totalOffsetMin =
    department.activeDelayMinutes + department.activeEmergencyMinutes + pauseBufferMin;

  const rank = waitingCount + 1;
  const patientsAhead = calledCount + waitingCount;
  const estimatedWaitMinutes = Math.max(
    department.avgConsultMinutes,
    remainingCurrentConsultMin +
      totalOffsetMin +
      patientsAhead * department.avgConsultMinutes +
      (inConsultation || calledCount > 0 ? 0 : department.avgConsultMinutes),
  );

  const estimatedConsultTimestamp = nowTimestamp + estimatedWaitMinutes * MINUTE_MS;
  const arrivalWindowStart = Math.max(nowTimestamp, estimatedConsultTimestamp - 20 * MINUTE_MS);
  const arrivalWindowEnd = Math.max(
    arrivalWindowStart + 10 * MINUTE_MS,
    estimatedConsultTimestamp - 5 * MINUTE_MS,
  );

  return {
    nextTokenNumber: `${department.code}-${department.nextSequence}`,
    position: rank,
    patientsAhead,
    estimatedWaitMinutes,
    estimatedConsultTimestamp,
    arrivalWindowStart,
    arrivalWindowEnd,
  };
}

export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatArrivalWindow(startTs: number, endTs: number, waitMinutes: number): string {
  if (waitMinutes <= 15) {
    return 'Proceed to OPD waiting area now';
  }
  return `${formatClockTime(startTs)} – ${formatClockTime(endTs)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export function estimateTravelMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 10;
  // Average rural/semi-urban bus/auto speed ~32 km/h + 10 min boarding buffer
  return Math.round((distanceKm / 32) * 60 + 10);
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export function getStatusMeta(status: QueueToken['status']): {
  label: string;
  textClass: string;
  boardClass: string;
} {
  switch (status) {
    case 'IN_CONSULTATION':
      return {
        label: 'In Consultation',
        textClass: 'text-emerald-700 dark:text-emerald-400 font-semibold',
        boardClass: 'text-emerald-400 font-semibold',
      };
    case 'CALLED':
      return {
        label: 'Called to Room',
        textClass: 'text-amber-700 dark:text-amber-300 font-semibold',
        boardClass: 'text-amber-300 font-semibold',
      };
    case 'WAITING':
      return {
        label: 'Waiting',
        textClass: 'text-slate-700 dark:text-slate-300 font-medium',
        boardClass: 'text-slate-300 font-medium',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        textClass: 'text-slate-500 dark:text-slate-400 font-medium',
        boardClass: 'text-slate-400 font-medium',
      };
    case 'NO_SHOW':
      return {
        label: 'No-Show',
        textClass: 'text-red-700 dark:text-red-400 font-semibold',
        boardClass: 'text-red-400 font-semibold',
      };
  }
}
