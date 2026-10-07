/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Routine,
  ExerciseDefinition,
  AppTab,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
} from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { RmLogsView } from './components/RmLogsView';
import { WorkoutHistoryView } from './components/WorkoutHistoryView';
import { ExerciseDiaryView } from './components/ExerciseDiaryView';
import { SidebarMenu } from './components/SidebarMenu';
import { RmRecordAlertModal } from './components/RmRecordAlertModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DataBackupModal } from './components/DataBackupModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { ActiveWorkoutTopBanner } from './components/ActiveWorkoutTopBanner';
import { ToastNotification } from './components/ToastNotification';
import { getTotalDiaryEntriesCount } from './utils/diaryCalculations';
import {
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
} from './utils/backup';
import { useAuth } from './hooks/useAuth';
import { useAppStorage } from './hooks/useAppStorage';
import { useSync } from './hooks/useSync';
import { useRoutines } from './hooks/useRoutines';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useRmTracker } from './hooks/useRmTracker';
import { useExerciseDiaryNavigation } from './hooks/useExerciseDiaryNavigation';

export default function App() {
  // Navigation & Modal Visibility
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ROUTINES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const account = useAuth();

  // Storage Layer (IndexedDB with automatic legacy localStorage migration)
  const {
    isStorageLoaded,
    isGuestTransferComplete,
    storageError,
    routines,
    setRoutines,
    catalog,
    setCatalog,
    activeSessions,
    setActiveSessions,
    rmLogs,
    setRmLogs,
    workoutHistory,
    setWorkoutHistory,
    exerciseDiary,
    setExerciseDiary,
    applyImportData,
    refreshStorage,
  } = useAppStorage(account.user?.id, account.isPremiumActive);

  useSync({
    ownerId: account.user?.id ?? null,
    premiumActive: account.isPremiumActive,
    isStorageLoaded,
    isOwnerHydrationComplete: isGuestTransferComplete,
    onSynced: refreshStorage,
    routines,
    catalog,
    activeSessions,
    rmLogs,
    workoutHistory,
    exerciseDiary,
  });

  // Routines & Catalog Domain Hook
  const {
    activeRoutineId,
    routineSubMode,
    activeRoutine,
    createRoutine,
    selectRoutine,
    closeRoutine,
    saveRoutine,
    duplicateRoutine,
    deleteRoutine,
    createCatalogExercise,
    updateCatalogExercise,
    deleteCatalogExercise,
  } = useRoutines({
    routines,
    setRoutines,
    catalog,
    setCatalog,
    onNotify: setFeedbackMessage,
    isPremiumActive: account.isPremiumActive,
  });

  // Workout Session Lifecycle Hook
  const {
    workoutSummary,
    startSession,
    toggleSetComplete,
    resetSession,
    finishSession,
    dismissWorkoutSummary,
    deleteHistoryLog,
    inProgressSessionEntry,
    inProgressRoutine,
  } = useWorkoutSession({
    routines,
    activeSessions,
    setActiveSessions,
    setWorkoutHistory,
    activeRoutineId,
  });

  // RM (Repetition Maximum) Tracker Hook
  const {
    pendingRmAlert,
    checkRmWeight,
    confirmRmAlert,
    dismissRmAlert,
  } = useRmTracker({
    rmLogs,
    setRmLogs,
    onNotify: setFeedbackMessage,
  });

  // Exercise Diary Navigation Hook
  const {
    diaryTargetExerciseName,
    diaryAutoOpenCreate,
    openExerciseDiary,
    clearDiaryNavigationState,
  } = useExerciseDiaryNavigation({
    exerciseDiary,
    onNavigateToTab: setActiveTab,
    onCloseActiveRoutine: closeRoutine,
    onDismissWorkoutSummary: dismissWorkoutSummary,
  });

  // Handle data import from JSON backup
  const handleImportComplete = (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newWorkoutHistory: WorkoutHistoryLog[],
    newExerciseDiary: ExerciseDiary[],
    summary: {
      exercisesAdded: number;
      exercisesReplaced: number;
      routinesAdded: number;
      exercisesInRoutinesUpdated?: number;
      rmLogsAdded?: number;
      rmLogsUpdated?: number;
      historyAdded?: number;
      diaryAdded?: number;
      diaryUpdated?: number;
      mode: 'merge' | 'overwrite';
    }
  ) => {
    if (!isRoutineCountAllowed(newRoutines.length, account.isPremiumActive)) {
      setFeedbackMessage(ROUTINE_LIMIT_ERROR_MESSAGE);
      return;
    }

    applyImportData(newCatalog, newRoutines, newRmLogs, newWorkoutHistory, newExerciseDiary);

    let msg = '';
    if (summary.mode === 'overwrite') {
      const totalNotes = newExerciseDiary.reduce((sum, d) => sum + (d.entries?.length || 0), 0);
      msg = `Copia restaurada: ${newCatalog.length} ejercicios, ${newRoutines.length} rutinas, ${newRmLogs.length} RMs, ${newWorkoutHistory.length} sesiones y ${totalNotes} notas de diario.`;
    } else {
      const parts: string[] = [];
      if (summary.exercisesAdded > 0) parts.push(`${summary.exercisesAdded} ejerc. añadidos`);
      if (summary.exercisesReplaced > 0) parts.push(`${summary.exercisesReplaced} ejerc. actualizados`);
      if (summary.exercisesInRoutinesUpdated && summary.exercisesInRoutinesUpdated > 0) {
        parts.push(`${summary.exercisesInRoutinesUpdated} en rutinas`);
      }
      if (summary.routinesAdded > 0) parts.push(`${summary.routinesAdded} rutinas añadidas`);
      if (summary.rmLogsAdded && summary.rmLogsAdded > 0) parts.push(`${summary.rmLogsAdded} RMs añadidos`);
      if (summary.rmLogsUpdated && summary.rmLogsUpdated > 0) parts.push(`${summary.rmLogsUpdated} RMs actualizados`);
      if (summary.historyAdded && summary.historyAdded > 0) parts.push(`${summary.historyAdded} sesiones añadidas`);
      if (summary.diaryAdded && summary.diaryAdded > 0) parts.push(`${summary.diaryAdded} entradas diario añadidas`);
      if (summary.diaryUpdated && summary.diaryUpdated > 0) parts.push(`${summary.diaryUpdated} entradas diario actualizadas`);
      msg = parts.length > 0
        ? `Importación completada: ${parts.join(', ')}.`
        : 'Datos combinados con éxito.';
    }
    setFeedbackMessage(msg);
  };

  // Wait for IndexedDB hydration before rendering the view to avoid state flash
  if (account.isLoading || !isStorageLoaded) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {activeRoutineId && activeRoutine ? (
        <RoutineView
          routine={activeRoutine}
          catalog={catalog}
          rmLogs={rmLogs}
          exerciseDiary={exerciseDiary}
          initialMode={routineSubMode}
          session={activeSessions[activeRoutine.id]}
          onSaveRoutine={saveRoutine}
          onSaveToCatalog={createCatalogExercise}
          onBack={closeRoutine}
          onStartSession={startSession}
          onToggleSetComplete={toggleSetComplete}
          onResetSession={resetSession}
          onFinishSession={finishSession}
          onCheckRmWeight={checkRmWeight}
          onOpenDiary={openExerciseDiary}
        />
      ) : (
        <div className="flex flex-col min-h-screen">
          <AppHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            routinesCount={routines.length}
            catalogCount={catalog.length}
            isPremiumActive={account.isPremiumActive}
            onOpenMenu={() => setIsMenuOpen(true)}
          />

          {inProgressSessionEntry && inProgressRoutine && (
            <ActiveWorkoutTopBanner
              routine={inProgressRoutine}
              session={inProgressSessionEntry}
              onOpenRoutine={() => selectRoutine(inProgressRoutine.id, 'execute')}
            />
          )}

          <PWAInstallBanner />

          <main className="flex-1">
            {activeTab === AppTab.ROUTINES ? (
              <RoutineList
                routines={routines}
                activeSessions={activeSessions}
                onCreateRoutine={createRoutine}
                onSelectRoutine={selectRoutine}
                onDuplicateRoutine={duplicateRoutine}
                onDeleteRoutine={(id) => deleteRoutine(id, resetSession)}
              />
            ) : activeTab === AppTab.EXERCISES ? (
              <ExerciseCatalog
                exercises={catalog}
                rmLogs={rmLogs}
                exerciseDiary={exerciseDiary}
                onCreateExercise={createCatalogExercise}
                onUpdateExercise={updateCatalogExercise}
                onDeleteExercise={deleteCatalogExercise}
                onCheckRmWeight={checkRmWeight}
                onOpenDiary={openExerciseDiary}
              />
            ) : activeTab === AppTab.RMS ? (
              <RmLogsView
                catalog={catalog}
                rmLogs={rmLogs}
                onSaveRmLogs={setRmLogs}
                onGoToCatalog={() => setActiveTab(AppTab.EXERCISES)}
              />
            ) : activeTab === AppTab.HISTORY ? (
              <WorkoutHistoryView
                historyLogs={workoutHistory}
                rmLogs={rmLogs}
                onDeleteLog={deleteHistoryLog}
                onGoToRoutines={() => setActiveTab(AppTab.ROUTINES)}
              />
            ) : (
              <ExerciseDiaryView
                catalog={catalog}
                diaries={exerciseDiary}
                onSaveDiaries={setExerciseDiary}
                onGoToCatalog={() => setActiveTab(AppTab.EXERCISES)}
                initialExerciseName={diaryTargetExerciseName}
                autoOpenCreate={diaryAutoOpenCreate}
                onClearInitialState={clearDiaryNavigationState}
              />
            )}
          </main>

          <AppFooter onOpenBackup={() => setIsBackupModalOpen(true)} />
        </div>
      )}

      {/* Sidebar Navigation Drawer */}
      <SidebarMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        routinesCount={routines.length}
        catalogCount={catalog.length}
        rmCount={rmLogs.length}
        historyCount={workoutHistory.length}
        diaryCount={getTotalDiaryEntriesCount(exerciseDiary)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        isAuthenticated={Boolean(account.user)}
        userEmail={account.user?.email ?? null}
        isPremiumActive={account.isPremiumActive}
        isEntitlementLoading={account.isEntitlementLoading}
        isSigningIn={account.isSigningIn}
        premiumExpiry={account.entitlement?.entitlement?.validUntil ?? null}
        error={account.error ?? storageError}
        onSignIn={account.signInWithGoogle}
        onSignOut={account.signOut}
      />

      {/* RM New Record Detection Alert Modal */}
      <RmRecordAlertModal
        isOpen={Boolean(pendingRmAlert)}
        exerciseName={pendingRmAlert?.exerciseName || ''}
        newWeight={pendingRmAlert?.newWeight || 0}
        previousRmWeight={pendingRmAlert?.previousRmWeight || 0}
        previousRmDate={pendingRmAlert?.previousRmDate}
        onConfirm={confirmRmAlert}
        onClose={dismissRmAlert}
      />

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal
        summary={workoutSummary}
        rmLogs={rmLogs}
        onClose={dismissWorkoutSummary}
      />

      {/* Import / Export JSON Backup Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        catalog={catalog}
        routines={routines}
        rmLogs={rmLogs}
        workoutHistory={workoutHistory}
        exerciseDiary={exerciseDiary}
        isPremiumActive={account.isPremiumActive}
        onImportComplete={handleImportComplete}
      />

      {/* Floating Feedback Toast Notification */}
      <ToastNotification
        message={feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
      />
    </div>
  );
}
