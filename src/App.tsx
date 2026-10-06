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
import { BottomTabBar } from './components/BottomTabBar';
import { getTotalDiaryEntriesCount } from './utils/diaryCalculations';
import { useAppStorage } from './hooks/useAppStorage';
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

  // Storage Layer (IndexedDB with automatic legacy localStorage migration)
  const {
    isStorageLoaded,
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
  } = useAppStorage();

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
  if (!isStorageLoaded) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans antialiased selection:bg-[#00FF87] selection:text-black">
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
        <div className="flex flex-col min-h-screen pb-16">
          <AppHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            routinesCount={routines.length}
            catalogCount={catalog.length}
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

          <main className="flex-1 pb-6">
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

          {/* Bottom Tab Bar */}
          <BottomTabBar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            routinesCount={routines.length}
            catalogCount={catalog.length}
            rmCount={rmLogs.length}
            historyCount={workoutHistory.length}
            diaryCount={getTotalDiaryEntriesCount(exerciseDiary)}
          />
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
