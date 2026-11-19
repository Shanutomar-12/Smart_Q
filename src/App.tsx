/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {AnimatePresence, MotionConfig} from 'motion/react';
import {PageTransition} from './components/MotionPrimitives';
import {PublicFooter} from './components/PublicFooter';
import {PublicNavbar} from './components/PublicNavbar';
import {SmsToastStack} from './components/SmsToastStack';
import {StaffShell} from './components/StaffSidebar';
import {OpdProvider, useOpd} from './context/OpdContext';
import {ThemeProvider} from './context/ThemeContext';
import {HomePage} from './pages/HomePage';
import {PatientDashboardPage} from './pages/PatientDashboardPage';
import {PublicBoardPage} from './pages/PublicBoardPage';
import {RegisterPage} from './pages/RegisterPage';
import {StaffDashboardPage} from './pages/StaffDashboardPage';
import {StaffDelaysPage} from './pages/StaffDelaysPage';
import {StaffLoginPage} from './pages/StaffLoginPage';
import {StaffQueueOpsPage} from './pages/StaffQueueOpsPage';
import {StaffSmsLogPage} from './pages/StaffSmsLogPage';
import {TrackTokenPage} from './pages/TrackTokenPage';

const STAFF_PROTECTED_VIEWS = new Set([
  'staff-dashboard',
  'staff-queue',
  'staff-delays',
  'staff-sms',
]);

const AppRouter: React.FC = () => {
  const {view, currentStaff, departments, activeStaffDeptId, tokens} = useOpd();

  const isStaffWorkspace =
    (STAFF_PROTECTED_VIEWS.has(view) || view === 'staff-login') &&
    Boolean(currentStaff);

  const activeDept =
    departments.find((d) => d.id === activeStaffDeptId) ?? departments[0];

  const getStaffMeta = (): {title: string; subtitle: string} => {
    const waitingCount = tokens.filter(
      (t) =>
        t.departmentId === activeDept.id &&
        (t.status === 'WAITING' || t.status === 'CALLED'),
    ).length;

    switch (view) {
      case 'staff-queue':
        return {
          title: 'Queue Operations',
          subtitle: `Manage live patient flow for ${activeDept.name} (${activeDept.roomNumber} · ${activeDept.doctorName}). All actions recalculate arrival windows immediately.`,
        };
      case 'staff-delays':
        return {
          title: 'Delays & Emergency Interruptions',
          subtitle: `Log schedule disruptions for ${activeDept.name}. The dynamic queue engine immediately postpones waiting arrival windows and sends SMS alerts to ${waitingCount} waiting patients.`,
        };
      case 'staff-sms':
        return {
          title: 'SMS Dispatch Log',
          subtitle:
            'Audit trail of all automated token confirmations, delay advisories, emergency broadcasts, and turn calls sent via the SMS Gateway.',
        };
      default:
        return {
          title: `${activeDept.name} OPD Overview`,
          subtitle: `${activeDept.doctorName} (${activeDept.doctorQualification}) · ${activeDept.roomNumber}, ${activeDept.floor} · Hours ${activeDept.opdHours}`,
        };
    }
  };

  const renderPublicContent = () => {
    if (STAFF_PROTECTED_VIEWS.has(view) && !currentStaff) {
      return <StaffLoginPage />;
    }

    switch (view) {
      case 'home':
        return <HomePage />;
      case 'register':
        return <RegisterPage />;
      case 'track':
        return <TrackTokenPage />;
      case 'patient-dashboard':
        return <PatientDashboardPage />;
      case 'public-board':
        return <PublicBoardPage />;
      case 'staff-login':
        return <StaffLoginPage />;
      default:
        return <HomePage />;
    }
  };

  const renderStaffContent = () => {
    switch (view) {
      case 'staff-queue':
        return <StaffQueueOpsPage />;
      case 'staff-delays':
        return <StaffDelaysPage />;
      case 'staff-sms':
        return <StaffSmsLogPage />;
      default:
        return <StaffDashboardPage />;
    }
  };

  if (isStaffWorkspace) {
    const {title, subtitle} = getStaffMeta();
    return (
      <>
        <StaffShell title={title} subtitle={subtitle}>
          {renderStaffContent()}
        </StaffShell>
        <SmsToastStack />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FC] dark:bg-[#071121] transition-colors duration-200">
      <PublicNavbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition viewKey={view}>{renderPublicContent()}</PageTransition>
        </AnimatePresence>
      </main>
      {view !== 'public-board' && <PublicFooter />}
      <SmsToastStack />
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <OpdProvider>
          <AppRouter />
        </OpdProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
