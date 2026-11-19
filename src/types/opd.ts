export type TokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'NO_SHOW';

export type StaffRole = 'ADMIN' | 'STAFF' | 'DOCTOR';

export type EventType =
  | 'TOKEN_ISSUED'
  | 'PATIENT_CALLED'
  | 'CONSULTATION_STARTED'
  | 'CONSULTATION_COMPLETED'
  | 'DOCTOR_DELAY'
  | 'EMERGENCY_CASE'
  | 'DELAY_CLEARED'
  | 'QUEUE_PAUSED'
  | 'QUEUE_RESUMED'
  | 'NO_SHOW_MARKED'
  | 'PATIENT_REQUEUED'
  | 'MANUAL_BROADCAST';

export type SmsCategory =
  | 'TOKEN_CONFIRMED'
  | 'YOUR_TURN'
  | 'DELAY_NOTICE'
  | 'EMERGENCY_ALERT'
  | 'QUEUE_STATUS'
  | 'REQUEUED'
  | 'BROADCAST';

export type AppView =
  | 'home'
  | 'register'
  | 'track'
  | 'patient-dashboard'
  | 'public-board'
  | 'staff-login'
  | 'staff-dashboard'
  | 'staff-queue'
  | 'staff-delays'
  | 'staff-sms';

export interface Department {
  id: string;
  code: string;
  name: string;
  doctorName: string;
  doctorQualification: string;
  roomNumber: string;
  floor: string;
  avgConsultMinutes: number;
  isPaused: boolean;
  pauseReason?: string;
  activeDelayMinutes: number;
  activeEmergencyMinutes: number;
  activeAdvisoryText?: string;
  activeAdvisoryType?: 'DELAY' | 'EMERGENCY';
  opdHours: string;
  nextSequence: number;
}

export interface QueueToken {
  id: string;
  tokenNumber: string;
  departmentId: string;
  patientName: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  locality: string;
  distanceKm: number;
  visitReason: string;
  status: TokenStatus;
  queueOrder: number; // Ordering key among WAITING tokens
  position: number | null; // 1-based waiting rank (null if not WAITING)
  patientsAhead: number;
  estimatedWaitMinutes: number;
  estimatedConsultTimestamp: number;
  arrivalWindowStart: number;
  arrivalWindowEnd: number;
  registeredAt: number;
  calledAt?: number;
  startedAt?: number;
  completedAt?: number;
  diagnosis?: string;
  prescription?: string;
  requeueCount: number;
}

export interface StaffUser {
  username: string;
  password: string;
  fullName: string;
  role: StaffRole;
  roleLabel: string;
  departmentId?: string; // undefined means hospital-wide (Admin)
}

export interface QueueEvent {
  id: string;
  departmentId: string;
  type: EventType;
  title: string;
  details: string;
  offsetMinutes?: number;
  tokenNumber?: string;
  performedBy: string;
  timestamp: number;
}

export interface SmsLog {
  id: string;
  departmentId: string;
  tokenNumber?: string;
  recipientName: string;
  phone: string;
  category: SmsCategory;
  message: string;
  status: 'DISPATCHED';
  timestamp: number;
}

export interface SmsToast {
  id: string;
  recipientName: string;
  phone: string;
  tokenNumber?: string;
  category: SmsCategory;
  message: string;
}

export interface RegistrationInput {
  patientName: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  locality: string;
  distanceKm: number;
  departmentId: string;
  visitReason: string;
}
