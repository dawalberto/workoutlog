import React from 'react';
import { DataBackupModal } from './DataBackupModal';
import { RestTimerBar } from './RestTimerBar';
import { RmRecordAlertModal } from './RmRecordAlertModal';
import { SidebarMenu } from './SidebarMenu';
import { SignOutConfirmDialog } from './SignOutConfirmDialog';
import { ToastNotification } from './ToastNotification';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';
import { useGlobalOverlays } from '../hooks/shell/useGlobalOverlays';

export const GlobalOverlays: React.FC = () => {
  const {
    activeRestTimer,
  } = useGlobalOverlays();

  return (
    <>
      {/* Sidebar Navigation Drawer */}
      <SidebarMenu />

      <SignOutConfirmDialog />

      {/* RM New Record Detection Alert Modal */}
      <RmRecordAlertModal />

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal />

      {/* Import / Export JSON Backup Modal */}
      <DataBackupModal />

      {/* Floating Rest Timer Bar across entire app (RoutineView, Diary, History, etc.) */}
      {activeRestTimer && (
        <RestTimerBar
          key={activeRestTimer.key || activeRestTimer.routineId}
        />
      )}

      {/* Floating Feedback Toast Notification */}
      <ToastNotification />
    </>
  );
};
