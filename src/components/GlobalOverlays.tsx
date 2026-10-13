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
    catalog,
    routines,
    rmLogs,
    workoutHistory,
    exerciseDiary,
    isBackupModalOpen,
    closeBackupModal,
    isSyncEnabled,
    activeRestTimer,
    workoutSummary,
    dismissWorkoutSummary,
    openDiary,
    onImportComplete,
  } = useGlobalOverlays();

  return (
    <>
      {/* Sidebar Navigation Drawer */}
      <SidebarMenu />

      <SignOutConfirmDialog />

      {/* RM New Record Detection Alert Modal */}
      <RmRecordAlertModal />

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal
        summary={workoutSummary}
        rmLogs={rmLogs}
        exerciseDiary={exerciseDiary}
        routines={routines}
        catalog={catalog}
        onOpenDiary={openDiary}
        onClose={dismissWorkoutSummary}
      />

      {/* Import / Export JSON Backup Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={closeBackupModal}
        catalog={catalog}
        routines={routines}
        rmLogs={rmLogs}
        workoutHistory={workoutHistory}
        exerciseDiary={exerciseDiary}
        isSyncEnabled={isSyncEnabled}
        onImportComplete={onImportComplete}
      />

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
