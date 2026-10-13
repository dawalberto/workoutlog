/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppTab } from './types';
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
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useAppStore } from './store/appStore';
import { useShallow } from 'zustand/react/shallow';
import {
  selectActiveRoutine,
  selectInProgressRoutine,
  selectInProgressSessionEntry,
  selectPersistedData,
} from './store/selectors';

export default function App() {
  useAppBootstrap();
  const persistedData = useAppStore(useShallow(selectPersistedData));
  const {
    isStorageLoaded,
    storageError,
    routines,
    catalog,
    activeSessions,
    rmLogs,
    setRmLogs,
    workoutHistory,
    exerciseDiary,
    setExerciseDiary,
  } = persistedData;
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const isMenuOpen = useAppStore((state) => state.isMenuOpen);
  const openMenu = useAppStore((state) => state.openMenu);
  const closeMenu = useAppStore((state) => state.closeMenu);
  const isBackupModalOpen = useAppStore((state) => state.isBackupModalOpen);
  const openBackupModal = useAppStore((state) => state.openBackupModal);
  const closeBackupModal = useAppStore((state) => state.closeBackupModal);
  const feedbackMessage = useAppStore((state) => state.feedbackMessage);
  const clearFeedback = useAppStore((state) => state.clearFeedback);
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const startRestTimer = useAppStore((state) => state.startRestTimer);
  const closeRestTimer = useAppStore((state) => state.closeRestTimer);
  const diaryTargetExerciseName = useAppStore((state) => state.diaryTargetExerciseName);
  const diaryAutoOpenCreate = useAppStore((state) => state.diaryAutoOpenCreate);
  const openDiary = useAppStore((state) => state.openExerciseDiary);
  const clearDiaryNavigationState = useAppStore((state) => state.clearDiaryNavigationState);
  const isSignOutConfirmOpen = useAppStore((state) => state.isSignOutConfirmOpen);
  const resolveSignOutConfirmation = useAppStore((state) => state.resolveSignOutConfirmation);
  const user = useAppStore((state) => state.user);
  const isSyncEnabled = useAppStore((state) => state.isSyncEnabled);
  const isLoading = useAppStore((state) => state.isLoading);
  const isSyncEligibilityLoading = useAppStore((state) => state.isSyncEligibilityLoading);
  const isSigningIn = useAppStore((state) => state.isSigningIn);
  const isSigningOut = useAppStore((state) => state.isSigningOut);
  const cleanupPending = useAppStore((state) => state.cleanupPending);
  const accountError = useAppStore((state) => state.error);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);
  const signOut = useAppStore((state) => state.signOut);
  const retryLocalCleanup = useAppStore((state) => state.retryLocalCleanup);
  const isOnline = useAppStore((state) => state.isOnline);

  const activeRoutineId = useAppStore((state) => state.activeRoutineId);
  const routineSubMode = useAppStore((state) => state.routineSubMode);
  const activeRoutine = useAppStore(selectActiveRoutine);
  const createRoutine = useAppStore((state) => state.createRoutine);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const closeRoutine = useAppStore((state) => state.closeRoutine);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const duplicateRoutine = useAppStore((state) => state.duplicateRoutine);
  const deleteRoutine = useAppStore((state) => state.deleteRoutine);
  const createCatalogExercise = useAppStore((state) => state.createCatalogExercise);
  const updateCatalogExercise = useAppStore((state) => state.updateCatalogExercise);
  const deleteCatalogExercise = useAppStore((state) => state.deleteCatalogExercise);
  const workoutSummary = useAppStore((state) => state.workoutSummary);
  const startSession = useAppStore((state) => state.startSession);
  const toggleSetComplete = useAppStore((state) => state.toggleSetComplete);
  const resetSession = useAppStore((state) => state.resetSession);
  const finishSession = useAppStore((state) => state.finishSession);
  const dismissWorkoutSummary = useAppStore((state) => state.dismissWorkoutSummary);
  const deleteHistoryLog = useAppStore((state) => state.deleteHistoryLog);
  const inProgressSessionEntry = useAppStore(selectInProgressSessionEntry);
  const inProgressRoutine = useAppStore(selectInProgressRoutine);
  const pendingRmAlert = useAppStore((state) => state.pendingRmAlert);
  const checkRmWeight = useAppStore((state) => state.checkRmWeight);
  const confirmRmAlert = useAppStore((state) => state.confirmRmAlert);
  const dismissRmAlert = useAppStore((state) => state.dismissRmAlert);
  const importBackup = useAppStore((state) => state.importBackup);
  // Wait for IndexedDB hydration before rendering the view to avoid state flash
  if (cleanupPending) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-5">
        <section
          role="alert"
          aria-busy={isSigningOut}
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
          {accountError && (
            <p className="mt-3 break-words text-sm text-rose-200">{accountError}</p>
          )}
          <button
            type="button"
            onClick={() => void retryLocalCleanup()}
            disabled={isSigningOut}
            className="mt-6 min-h-[48px] w-full rounded-2xl bg-[#00FF87] px-5 py-3 font-extrabold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          >
            {isSigningOut ? 'Limpiando datos…' : 'Reintentar limpieza'}
          </button>
        </section>
      </div>
    );
  }

  if (
    isLoading ||
    !isStorageLoaded ||
    (isSigningOut && !isSignOutConfirmOpen)
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
          onResetSession={resetSession}
          onFinishSession={finishSession}
          onCheckRmWeight={checkRmWeight}
          onOpenDiary={openDiary}
          onStartRestTimer={startRestTimer}
          onCloseRestTimer={closeRestTimer}
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
                onDeleteRoutine={deleteRoutine}
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
                onOpenDiary={openDiary}
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
        isAuthenticated={Boolean(user)}
        userEmail={user?.email ?? null}
        isSyncEnabled={isSyncEnabled}
        isSyncEligibilityLoading={isSyncEligibilityLoading}
        isOnline={isOnline}
        isSigningIn={isSigningIn}
        isSigningOut={isSigningOut}
        error={accountError ?? storageError}
        onSignIn={signInWithGoogle}
        onSignOut={async () => { await signOut(); }}
      />

      <ConfirmDialog
        isOpen={isSignOutConfirmOpen}
        title="¿Cerrar sesión?"
        message="Tienes cambios sin sincronizar. Si cierras sesión ahora se perderán en este dispositivo."
        confirmLabel="Cerrar sesión igualmente"
        onCancel={() => resolveSignOutConfirmation(false)}
        onConfirm={() => resolveSignOutConfirmation(true)}
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
        onImportComplete={(
          newCatalog,
          newRoutines,
          newRmLogs,
          newWorkoutHistory,
          newExerciseDiary,
          summary,
        ) => importBackup({
          catalog: newCatalog,
          routines: newRoutines,
          rmLogs: newRmLogs,
          workoutHistory: newWorkoutHistory,
          exerciseDiary: newExerciseDiary,
        }, summary)}
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
          onClose={closeRestTimer}
        />
      )}

      {/* Floating Feedback Toast Notification */}
      <ToastNotification
        message={feedbackMessage}
        onClose={clearFeedback}
      />
    </div>
  );
}
