/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Routine,
  ExerciseDefinition,
  ActiveWorkoutSession,
  AppTab,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
} from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { RestTimerBar } from './components/RestTimerBar';
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
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { ActiveWorkoutTopBanner } from './components/ActiveWorkoutTopBanner';
import { ToastNotification } from './components/ToastNotification';
import { BottomTabBar } from './components/BottomTabBar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { getTotalDiaryEntriesCount } from './utils/diaryCalculations';
import {
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
} from './utils/backup';
import { useAuth } from './hooks/useAuth';
import { useStorageLifecycle } from './hooks/useStorageLifecycle';
import { useSync } from './hooks/useSync';
import { useRoutines } from './hooks/useRoutines';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useRmTracker } from './hooks/useRmTracker';
import { useExerciseDiaryNavigation } from './hooks/useExerciseDiaryNavigation';
import { useAppViewState } from './hooks/useAppViewState';
import { useActiveRestTimer } from './hooks/useActiveRestTimer';
import { useAppStore, appStore } from './store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { applyImportData, refreshFromStorage } from './store/persistence';

const EMPTY_PERSISTED_DATA = {
  routines: [] as Routine[],
  catalog: [] as ExerciseDefinition[],
  activeSessions: {} as Record<string, ActiveWorkoutSession>,
  rmLogs: [] as ExerciseRmLog[],
  workoutHistory: [] as WorkoutHistoryLog[],
  exerciseDiary: [] as ExerciseDiary[],
};

export default function App() {
  const {
    activeTab,
    closeMenu,
    closeBackupModal,
    isBackupModalOpen,
    isMenuOpen,
    openBackupModal,
    openMenu,
    setActiveTab,
    setIsBackupModalOpen,
    setIsMenuOpen,
  } = useAppViewState();
  const [isUnsyncedSignOutDialogOpen, setIsUnsyncedSignOutDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const resolveSignOutConfirmationRef = useRef<((confirmed: boolean) => void) | null>(null);
  const account = useAuth();

  useStorageLifecycle(account.user?.id, account.isSyncEnabled);
  const currentScopeKey = account.user?.id
    ? `owner:${encodeURIComponent(account.user.id)}`
    : 'guest';

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
  } = useAppStore(useShallow((state) => {
    const isCurrentScope = state.hydratedScopeKey === currentScopeKey;
    return {
      isStorageLoaded: isCurrentScope && state.isStorageLoaded,
      isGuestTransferComplete: state.isGuestTransferComplete,
      storageError: isCurrentScope ? state.storageError : null,
      routines: isCurrentScope ? state.routines : EMPTY_PERSISTED_DATA.routines,
      setRoutines: state.setRoutines,
      catalog: isCurrentScope ? state.catalog : EMPTY_PERSISTED_DATA.catalog,
      setCatalog: state.setCatalog,
      activeSessions: isCurrentScope ? state.activeSessions : EMPTY_PERSISTED_DATA.activeSessions,
      setActiveSessions: state.setActiveSessions,
      rmLogs: isCurrentScope ? state.rmLogs : EMPTY_PERSISTED_DATA.rmLogs,
      setRmLogs: state.setRmLogs,
      workoutHistory: isCurrentScope ? state.workoutHistory : EMPTY_PERSISTED_DATA.workoutHistory,
      setWorkoutHistory: state.setWorkoutHistory,
      exerciseDiary: isCurrentScope ? state.exerciseDiary : EMPTY_PERSISTED_DATA.exerciseDiary,
      setExerciseDiary: state.setExerciseDiary,
    };
  }));

  const refreshSyncedStorage = () => refreshFromStorage(appStore, account.user?.id);

  const sync = useSync({
    ownerId: account.user?.id ?? null,
    syncEnabled: account.isSyncEnabled,
    isStorageLoaded,
    isOwnerHydrationComplete: isGuestTransferComplete,
    onSynced: refreshSyncedStorage,
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
    isSyncEnabled: account.isSyncEnabled,
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

  const { activeRestTimer, handleCloseRestTimer, handleStartRestTimer } = useActiveRestTimer();

  const handleConfirmUnsyncedSignOut = (confirmed: boolean) => {
    setIsUnsyncedSignOutDialogOpen(false);
    const resolve = resolveSignOutConfirmationRef.current;
    resolveSignOutConfirmationRef.current = null;
    resolve?.(confirmed);
  };

  const resetAfterSignOut = () => {
    setActiveTab(AppTab.ROUTINES);
    setIsMenuOpen(false);
    setIsBackupModalOpen(false);
    closeRoutine();
    dismissWorkoutSummary();
    dismissRmAlert();
    clearDiaryNavigationState();
    handleCloseRestTimer();
  };

  const handleSignOut = async () => {
    const signedOut = await account.signOut({
      syncBeforeSignOut: async () => {
        if (account.isSyncEnabled && sync.isOnline) await sync.syncNow();
      },
      confirmPendingChanges: async () =>
        new Promise<boolean>((resolve) => {
          resolveSignOutConfirmationRef.current = resolve;
          setIsUnsyncedSignOutDialogOpen(true);
        }),
      stopSync: sync.stopSync,
      resumeSync: sync.resumeSync,
    });
    if (!signedOut) return;

    resetAfterSignOut();
  };

  const handleRetryLocalCleanup = async () => {
    if (await account.retryLocalCleanup()) resetAfterSignOut();
  };

  const handleResetSession = (routineId: string) => {
    resetSession(routineId);
    handleCloseRestTimer();
  };

  const handleFinishSession = (summary: Parameters<typeof finishSession>[0]) => {
    finishSession(summary);
    handleCloseRestTimer();
  };

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
    if (!isRoutineCountAllowed(newRoutines.length, account.isSyncEnabled)) {
      setFeedbackMessage(ROUTINE_LIMIT_ERROR_MESSAGE);
      return;
    }

    applyImportData(appStore, newCatalog, newRoutines, newRmLogs, newWorkoutHistory, newExerciseDiary);

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

  // Reset scroll to top when changing tabs
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Wait for IndexedDB hydration before rendering the view to avoid state flash
  if (account.cleanupPending) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-5">
        <section
          role="alert"
          aria-busy={account.isSigningOut}
          className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#1C1C1E] p-6 shadow-2xl sm:p-8"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-rose-300">
            Limpieza local incompleta
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            No se pudieron eliminar por completo tus datos locales.
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            La sesión en línea ya se cerró. Reintenta la limpieza para quitar los datos de esta cuenta
            y del dispositivo antes de continuar.
          </p>
          {account.error && (
            <p className="mt-3 break-words text-sm text-rose-200">{account.error}</p>
          )}
          <button
            type="button"
            onClick={() => void handleRetryLocalCleanup()}
            disabled={account.isSigningOut}
            className="mt-6 min-h-[48px] w-full rounded-2xl bg-[#00FF87] px-5 py-3 font-extrabold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          >
            {account.isSigningOut ? 'Limpiando datos…' : 'Reintentar limpieza'}
          </button>
        </section>
      </div>
    );
  }

  if (
    account.isLoading ||
    !isStorageLoaded ||
    (account.isSigningOut && !isUnsyncedSignOutDialogOpen)
  ) {
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
          activeRestTimer={activeRestTimer}
          onSaveRoutine={saveRoutine}
          onSaveToCatalog={createCatalogExercise}
          onBack={() => {
            closeRoutine();
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }}
          onStartSession={startSession}
          onToggleSetComplete={toggleSetComplete}
          onResetSession={handleResetSession}
          onFinishSession={handleFinishSession}
          onCheckRmWeight={checkRmWeight}
          onOpenDiary={openExerciseDiary}
          onStartRestTimer={handleStartRestTimer}
          onCloseRestTimer={handleCloseRestTimer}
        />
      ) : (
        <div className="flex flex-col min-h-screen pb-16">
          <AppHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            routinesCount={routines.length}
            catalogCount={catalog.length}
            onOpenMenu={openMenu}
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
                onDeleteRoutine={(id) => deleteRoutine(id, handleResetSession)}
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
                routines={routines}
                catalog={catalog}
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
        onClose={closeMenu}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        routinesCount={routines.length}
        catalogCount={catalog.length}
        rmCount={rmLogs.length}
        historyCount={workoutHistory.length}
        diaryCount={getTotalDiaryEntriesCount(exerciseDiary)}
        onOpenBackup={openBackupModal}
        isAuthenticated={Boolean(account.user)}
        userEmail={account.user?.email ?? null}
        isSyncEnabled={account.isSyncEnabled}
        isSyncEligibilityLoading={account.isSyncEligibilityLoading}
        isOnline={sync.isOnline}
        isSigningIn={account.isSigningIn}
        isSigningOut={account.isSigningOut}
        error={account.error ?? storageError}
        onSignIn={account.signInWithGoogle}
        onSignOut={handleSignOut}
      />

      <ConfirmDialog
        isOpen={isUnsyncedSignOutDialogOpen}
        title="¿Cerrar sesión?"
        message="Tienes cambios sin sincronizar. Si cierras sesión ahora se perderán en este dispositivo."
        confirmLabel="Cerrar sesión igualmente"
        onCancel={() => handleConfirmUnsyncedSignOut(false)}
        onConfirm={() => handleConfirmUnsyncedSignOut(true)}
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
        exerciseDiary={exerciseDiary}
        routines={routines}
        catalog={catalog}
        onOpenDiary={openExerciseDiary}
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
        isSyncEnabled={account.isSyncEnabled}
        onImportComplete={handleImportComplete}
      />

      {/* Floating Rest Timer Bar across entire app (RoutineView, Diary, History, etc.) */}
      {activeRestTimer && (
        <RestTimerBar
          key={activeRestTimer.key || activeRestTimer.routineId}
          initialSeconds={activeRestTimer.initialSeconds}
          targetEndTime={activeRestTimer.targetEndTime}
          exerciseName={activeRestTimer.exerciseName}
          setNumber={activeRestTimer.setNumber}
          isInsideActiveRoutine={Boolean(activeRoutineId)}
          onReturnToRoutine={
            !activeRoutineId
              ? () => selectRoutine(activeRestTimer.routineId, 'execute')
              : undefined
          }
          onClose={handleCloseRestTimer}
        />
      )}

      {/* Floating Feedback Toast Notification */}
      <ToastNotification
        message={feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
      />
    </div>
  );
}
