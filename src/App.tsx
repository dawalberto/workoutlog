/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Routine,
  ExerciseDefinition,
  AppTab,
  ExerciseRmLog,
  WorkoutHistoryLog,
  ExerciseDiary,
  ActiveRestTimer,
} from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { RestTimerBar } from './components/RestTimerBar';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { RmLogsView } from './components/RmLogsView';
import { WorkoutHistoryView } from './components/WorkoutHistoryView';
import { ExerciseDiaryView } from './components/ExerciseDiaryView';
import { SidebarMenu } from './components/SidebarMenu';
import { BillingPlansModal } from './components/BillingPlansModal';
import { RmRecordAlertModal } from './components/RmRecordAlertModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DataBackupModal } from './components/DataBackupModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { AppHeader } from './components/AppHeader';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { ActiveWorkoutTopBanner } from './components/ActiveWorkoutTopBanner';
import { ToastNotification } from './components/ToastNotification';
import { BottomTabBar } from './components/BottomTabBar';
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
import { BILLING_UI_ENABLED } from './config/features';
import {
  getBillingReturnPath,
  getBillingReturnStatus,
  type BillingPlan,
  type BillingReturnStatus,
} from './services/billing';

export default function App() {
  // Navigation & Modal Visibility
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ROUTINES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBillingPlansOpen, setIsBillingPlansOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [billingReturnStatus, setBillingReturnStatus] =
    useState<BillingReturnStatus | null>(() =>
      typeof window === 'undefined'
        ? null
        : getBillingReturnStatus(window.location.pathname),
    );

  const account = useAuth();

  useEffect(() => {
    if (!BILLING_UI_ENABLED || !billingReturnStatus || account.isLoading) return;
    setIsBillingPlansOpen(true);
    void account.refreshEntitlement();

    const url = new URL(window.location.href);
    url.pathname = getBillingReturnPath(url.pathname);
    url.searchParams.delete('session_id');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [billingReturnStatus, account.isLoading]);

  const handleCheckout = async (plan: BillingPlan) => {
    const checkoutUrl = await account.requestCheckoutSession(plan);
    if (checkoutUrl) window.location.assign(checkoutUrl);
  };

  const handleOpenBillingPortal = async () => {
    const portalUrl = await account.requestBillingPortalSession();
    if (portalUrl) window.location.assign(portalUrl);
  };

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

  const sync = useSync({
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

  // Global Rest Timer state across routine training, diary, history & all tabs
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(() => {
    try {
      const saved = sessionStorage.getItem('current_rest_timer');
      if (saved) {
        const parsed: ActiveRestTimer = JSON.parse(saved);
        if (parsed.targetEndTime && parsed.targetEndTime > Date.now() - 60000) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const handleStartRestTimer = (timer: ActiveRestTimer) => {
    setActiveRestTimer(timer);
    try {
      sessionStorage.setItem('current_rest_timer', JSON.stringify(timer));
    } catch {}
  };

  const handleCloseRestTimer = () => {
    setActiveRestTimer(null);
    try {
      sessionStorage.removeItem('current_rest_timer');
    } catch {}
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

  // Reset scroll to top when changing tabs
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Wait for IndexedDB hydration before rendering the view to avoid state flash
  if (account.isLoading || !isStorageLoaded) {
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
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        routinesCount={routines.length}
        catalogCount={catalog.length}
        rmCount={rmLogs.length}
        historyCount={workoutHistory.length}
        diaryCount={getTotalDiaryEntriesCount(exerciseDiary)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenBillingPlans={() => setIsBillingPlansOpen(true)}
        isAuthenticated={Boolean(account.user)}
        userEmail={account.user?.email ?? null}
        isPremiumActive={account.isPremiumActive}
        isEntitlementLoading={account.isEntitlementLoading}
        isOnline={sync.isOnline}
        isSigningIn={account.isSigningIn}
        premiumExpiry={account.entitlement?.entitlement?.validUntil ?? null}
        error={account.error ?? storageError}
        onSignIn={account.signInWithGoogle}
        onSignOut={account.signOut}
      />

      {BILLING_UI_ENABLED && (
        <BillingPlansModal
          isOpen={isBillingPlansOpen}
          isAuthenticated={Boolean(account.user)}
          isPremiumActive={account.isPremiumActive}
          activePlanIds={account.entitlement?.entitlement?.activePlanIds ?? []}
          isEntitlementLoading={account.isEntitlementLoading}
          isBillingLoading={account.isBillingLoading}
          billingError={account.error}
          returnStatus={billingReturnStatus}
          onClose={() => {
            setIsBillingPlansOpen(false);
            setBillingReturnStatus(null);
          }}
          onSignIn={account.signInWithGoogle}
          onCheckout={handleCheckout}
          onOpenBillingPortal={handleOpenBillingPortal}
          onRefreshEntitlement={async () => {
            await account.refreshEntitlement();
          }}
        />
      )}

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
        onClose={() => setIsBackupModalOpen(false)}
        catalog={catalog}
        routines={routines}
        rmLogs={rmLogs}
        workoutHistory={workoutHistory}
        exerciseDiary={exerciseDiary}
        isPremiumActive={account.isPremiumActive}
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
