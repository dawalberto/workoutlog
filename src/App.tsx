/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Flame, Dumbbell, ArrowDownUp, CheckCircle2, X, Trophy, Menu, ArrowRight } from 'lucide-react';
import { 
  Routine, 
  RoutineSubMode, 
  ExerciseDefinition, 
  AppTab, 
  ActiveWorkoutSession, 
  WorkoutCompletionSummary,
  ExerciseRmLog,
  RmRecord,
  WorkoutHistoryLog
} from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { RmLogsView } from './components/RmLogsView';
import { WorkoutHistoryView } from './components/WorkoutHistoryView';
import { SidebarMenu } from './components/SidebarMenu';
import { RmRecordAlertModal } from './components/RmRecordAlertModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DataBackupModal } from './components/DataBackupModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { normalizeExerciseTitle } from './utils/backup';
import { formatWorkoutDuration, formatDetailedDuration } from './utils/timeCalculations';
import { useWorkoutTimer } from './hooks/useWorkoutTimer';
import { 
  findRmLogForExercise, 
  getLatestRmRecord, 
  getTodayDateString 
} from './utils/rmCalculations';

const ROUTINES_STORAGE_KEY = 'workout_planner_routines_v2';
const CATALOG_STORAGE_KEY = 'workout_planner_catalog_v2';
const ACTIVE_SESSIONS_STORAGE_KEY = 'workout_active_sessions_v1';
const RM_LOGS_STORAGE_KEY = 'workout_planner_rm_logs_v1';
const WORKOUT_HISTORY_STORAGE_KEY = 'workout_planner_history_v1';

// Top banner shown when an active routine is in progress and the user is browsing elsewhere
const ActiveWorkoutTopBanner: React.FC<{
  routine: Routine;
  session: ActiveWorkoutSession;
  onOpenRoutine: () => void;
}> = ({ routine, session, onOpenRoutine }) => {
  const elapsed = useWorkoutTimer(session.startTime);
  const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedCount = session.completedSetIds.length;

  return (
    <div
      id="active-workout-top-banner"
      className="bg-emerald-700 text-white px-3 sm:px-6 py-2 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping shrink-0" />
        <span className="font-bold truncate">Entrenamiento en curso: {routine.name}</span>
        <span className="hidden sm:inline text-emerald-200">
          ({completedCount}/{totalSets} series)
        </span>
        <span className="font-mono bg-emerald-800/90 border border-emerald-600/60 px-2 py-0.5 rounded-md font-bold text-white shrink-0 text-xs">
          ⏱️ {formatWorkoutDuration(elapsed)}
        </span>
      </div>
      <button
        id="btn-return-to-active-routine"
        type="button"
        onClick={onOpenRoutine}
        title="Volver a la rutina"
        aria-label="Volver a la rutina"
        className="shrink-0 p-1.5 sm:p-2 bg-white text-emerald-950 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-xs flex items-center justify-center"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function App() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      localStorage.removeItem('workout_planner_routines_v1');
      const saved = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return [];
  });

  const [catalog, setCatalog] = useState<ExerciseDefinition[]>(() => {
    try {
      localStorage.removeItem('workout_planner_catalog_v1');
      const saved = localStorage.getItem(CATALOG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return [];
  });

  // Persistent active workout sessions: Record<routineId, ActiveWorkoutSession>
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveWorkoutSession>>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SESSIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return {};
  });

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ROUTINES);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [routineSubMode, setRoutineSubMode] = useState<RoutineSubMode>('edit');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutCompletionSummary | null>(null);

  // Persistent RM logs
  const [rmLogs, setRmLogs] = useState<ExerciseRmLog[]>(() => {
    try {
      const saved = localStorage.getItem(RM_LOGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Persistent Workout History logs
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryLog[]>(() => {
    try {
      const saved = localStorage.getItem(WORKOUT_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // RM New Record Alert Modal state
  const [pendingRmAlert, setPendingRmAlert] = useState<{
    logId: string;
    exerciseName: string;
    newWeight: number;
    previousRmWeight: number;
    previousRmDate?: string;
  } | null>(null);

  // Save routines to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routines));
    } catch (e) {
      console.error('Error saving routines to localStorage', e);
    }
  }, [routines]);

  // Save catalog to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
    } catch (e) {
      console.error('Error saving catalog to localStorage', e);
    }
  }, [catalog]);

  // Save active workout sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SESSIONS_STORAGE_KEY, JSON.stringify(activeSessions));
    } catch (e) {
      console.error('Error saving active sessions to localStorage', e);
    }
  }, [activeSessions]);

  // Save RM logs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(RM_LOGS_STORAGE_KEY, JSON.stringify(rmLogs));
    } catch (e) {
      console.error('Error saving rmLogs to localStorage', e);
    }
  }, [rmLogs]);

  // Save workout history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(WORKOUT_HISTORY_STORAGE_KEY, JSON.stringify(workoutHistory));
    } catch (e) {
      console.error('Error saving workout history to localStorage', e);
    }
  }, [workoutHistory]);

  // Check if a newly entered weight exceeds the last logged RM for that exercise
  const handleCheckRmWeight = (exerciseName: string, newWeight: number, exerciseId?: string) => {
    if (!exerciseName || !newWeight || newWeight <= 0) return;
    if (pendingRmAlert) return; // Prevent duplicate popup if already open

    const matchingLog = findRmLogForExercise(rmLogs, exerciseName, exerciseId);
    if (!matchingLog || !matchingLog.records || matchingLog.records.length === 0) return;

    const latestRecord = getLatestRmRecord(matchingLog);
    if (!latestRecord) return;

    if (newWeight > latestRecord.weight) {
      setPendingRmAlert({
        logId: matchingLog.id,
        exerciseName: matchingLog.exerciseName,
        newWeight,
        previousRmWeight: latestRecord.weight,
        previousRmDate: latestRecord.date,
      });
    }
  };

  const handleConfirmRmAlert = (shouldUpdateRm: boolean) => {
    if (!pendingRmAlert) return;
    if (shouldUpdateRm) {
      const newRecord: RmRecord = {
        id: `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        weight: pendingRmAlert.newWeight,
        date: getTodayDateString(),
        notes: 'Superado en rutina / ejercicio',
      };

      setRmLogs((prev) =>
        prev.map((log) => {
          if (
            log.id === pendingRmAlert.logId ||
            normalizeExerciseTitle(log.exerciseName) === normalizeExerciseTitle(pendingRmAlert.exerciseName)
          ) {
            const newRecords = [newRecord, ...log.records].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            return {
              ...log,
              records: newRecords,
              updatedAt: new Date().toISOString(),
            };
          }
          return log;
        })
      );
      setImportFeedback(`🏆 ¡Nuevo RM de ${pendingRmAlert.newWeight} kg registrado en ${pendingRmAlert.exerciseName}!`);
      setTimeout(() => setImportFeedback(null), 4000);
    }
    setPendingRmAlert(null);
  };

  // Workout Session Handlers
  const handleStartSession = (routineId: string) => {
    setActiveSessions((prev) => ({
      ...prev,
      [routineId]: {
        routineId,
        startTime: prev[routineId]?.startTime || Date.now(),
        completedSetIds: prev[routineId]?.completedSetIds || [],
      },
    }));
  };

  const handleToggleSetComplete = (routineId: string, setId: string) => {
    setActiveSessions((prev) => {
      const current = prev[routineId] || {
        routineId,
        startTime: Date.now(),
        completedSetIds: [],
      };

      const setExists = current.completedSetIds.includes(setId);
      const nextCompleted = setExists
        ? current.completedSetIds.filter((id) => id !== setId)
        : [...current.completedSetIds, setId];

      return {
        ...prev,
        [routineId]: {
          ...current,
          completedSetIds: nextCompleted,
        },
      };
    });
  };

  const handleResetSession = (routineId: string) => {
    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
  };

  const handleFinishSession = (summary: WorkoutCompletionSummary) => {
    // 1. Remove from active sessions
    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[summary.routineId];
      return next;
    });

    // 2. Open summary celebration modal
    setWorkoutSummary(summary);

    // 3. Save automatically to workout history
    const newLog: WorkoutHistoryLog = {
      ...summary,
      id: 'workout-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      completedAt: new Date(summary.endTime || Date.now()).toISOString(),
    };
    setWorkoutHistory((prev) => [newLog, ...prev]);
  };

  const handleDeleteHistoryLog = (logId: string) => {
    setWorkoutHistory((prev) => prev.filter((l) => l.id !== logId));
  };

  // Catalog CRUD handlers
  const handleCreateCatalogExercise = (exercise: ExerciseDefinition) => {
    setCatalog((prev) => {
      const exists = prev.some((e) => e.id === exercise.id);
      if (exists) {
        return prev.map((e) => (e.id === exercise.id ? exercise : e));
      }
      return [exercise, ...prev];
    });
  };

  const handleUpdateCatalogExercise = (exercise: ExerciseDefinition) => {
    const oldDef = catalog.find((e) => e.id === exercise.id);
    const oldNorm = oldDef ? normalizeExerciseTitle(oldDef.name) : '';
    const newNorm = normalizeExerciseTitle(exercise.name);

    setCatalog((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)));

    let updatedRoutinesCount = 0;
    setRoutines((prevRoutines) => {
      const updated = prevRoutines.map((routine) => {
        let routineChanged = false;

        const updatedExercises = routine.exercises.map((ex) => {
          const exNorm = normalizeExerciseTitle(ex.name);
          const matchesById = Boolean(ex.definitionId && ex.definitionId === exercise.id);
          const matchesByOldName = Boolean(oldNorm && exNorm === oldNorm);
          const matchesByNewName = Boolean(newNorm && exNorm === newNorm);

          if (matchesById || matchesByOldName || matchesByNewName) {
            routineChanged = true;
            return {
              ...ex,
              definitionId: exercise.id,
              name: exercise.name,
              category: exercise.category,
              imageUrl: exercise.imageUrl || '',
              videoUrl: exercise.videoUrl || '',
              notes: exercise.notes || '',
            };
          }
          return ex;
        });

        if (routineChanged) {
          updatedRoutinesCount++;
          return {
            ...routine,
            exercises: updatedExercises,
            updatedAt: new Date().toISOString(),
          };
        }
        return routine;
      });

      return updatedRoutinesCount > 0 ? updated : prevRoutines;
    });

    if (updatedRoutinesCount > 0) {
      setImportFeedback(
        `"${exercise.name}" actualizado en biblioteca y en ${updatedRoutinesCount} rutina${updatedRoutinesCount > 1 ? 's' : ''}`
      );
      setTimeout(() => {
        setImportFeedback((curr) => (curr && curr.includes(exercise.name) ? null : curr));
      }, 3500);
    }
  };

  const handleDeleteCatalogExercise = (id: string) => {
    setCatalog((prev) => prev.filter((e) => e.id !== id));
  };

  // Create new routine
  const handleCreateRoutine = () => {
    const newRoutine: Routine = {
      id: 'routine-' + Date.now(),
      name: 'Nueva Rutina ' + (routines.length + 1),
      notes: '',
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRoutines([newRoutine, ...routines]);
    setActiveRoutineId(newRoutine.id);
    setRoutineSubMode('edit');
  };

  // Select routine to edit or execute
  const handleSelectRoutine = (routineId: string, mode: RoutineSubMode) => {
    setActiveRoutineId(routineId);
    setRoutineSubMode(mode);
  };

  // Update routine in list
  const handleSaveRoutine = (updatedRoutine: Routine) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r))
    );
  };

  // Duplicate routine
  const handleDuplicateRoutine = (routineId: string) => {
    const target = routines.find((r) => r.id === routineId);
    if (!target) return;

    const cloned: Routine = {
      ...target,
      id: 'routine-' + Date.now(),
      name: `${target.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: target.exercises.map((ex) => ({
        ...ex,
        id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        sets: ex.sets.map((s) => ({
          ...s,
          id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        })),
      })),
    };

    setRoutines([cloned, ...routines]);
  };

  // Delete routine
  const handleDeleteRoutine = (routineId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta rutina?')) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      if (activeRoutineId === routineId) {
        setActiveRoutineId(null);
      }
      handleResetSession(routineId);
    }
  };

  // Complete data import
  const handleImportComplete = (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newWorkoutHistory: WorkoutHistoryLog[],
    summary: {
      exercisesAdded: number;
      exercisesReplaced: number;
      routinesAdded: number;
      exercisesInRoutinesUpdated?: number;
      rmLogsAdded?: number;
      rmLogsUpdated?: number;
      historyAdded?: number;
      mode: 'merge' | 'overwrite';
    }
  ) => {
    setCatalog(newCatalog);
    setRoutines(newRoutines);
    setRmLogs(newRmLogs);
    setWorkoutHistory(newWorkoutHistory);

    let msg = '';
    if (summary.mode === 'overwrite') {
      msg = `Copia restaurada: ${newCatalog.length} ejercicios, ${newRoutines.length} rutinas, ${newRmLogs.length} RMs y ${newWorkoutHistory.length} sesiones.`;
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
      msg = parts.length > 0
        ? `Importación completada: ${parts.join(', ')}.`
        : 'Datos combinados con éxito.';
    }
    setImportFeedback(msg);
    setTimeout(() => setImportFeedback(null), 5000);
  };

  const activeRoutine = routines.find((r) => r.id === activeRoutineId);

  // Check if any workout session is currently active while user is on catalog or routine list
  const inProgressSessionEntry = Object.values(activeSessions).find(
    (s) => s.startTime && s.routineId !== activeRoutineId
  );
  const inProgressRoutine = inProgressSessionEntry
    ? routines.find((r) => r.id === inProgressSessionEntry.routineId)
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {activeRoutineId && activeRoutine ? (
        <RoutineView
          routine={activeRoutine}
          catalog={catalog}
          initialMode={routineSubMode}
          session={activeSessions[activeRoutine.id]}
          onSaveRoutine={handleSaveRoutine}
          onSaveToCatalog={handleCreateCatalogExercise}
          onBack={() => setActiveRoutineId(null)}
          onStartSession={handleStartSession}
          onToggleSetComplete={handleToggleSetComplete}
          onResetSession={handleResetSession}
          onFinishSession={handleFinishSession}
          onCheckRmWeight={handleCheckRmWeight}
        />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Main Top Navigation Bar: | LOGO   RUTINAS/EJERCICIOS   MENU BURGER | */}
          <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
            <div className="max-w-4xl mx-auto px-3 sm:px-6">
              <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
                {/* Left: LOGO ONLY */}
                <button
                  id="btn-nav-logo"
                  type="button"
                  onClick={() => setActiveTab(AppTab.ROUTINES)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0 hover:bg-zinc-800 transition-colors active:scale-95"
                  title="WorkoutLog - Rutinas"
                  aria-label="WorkoutLog"
                >
                  <Flame className="w-5 h-5 text-emerald-400 fill-current" />
                </button>

                {/* Center: RUTINAS / EJERCICIOS */}
                <nav className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 shrink-0 shadow-2xs">
                  <button
                    id="tab-nav-routines"
                    type="button"
                    onClick={() => setActiveTab(AppTab.ROUTINES)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                      activeTab === AppTab.ROUTINES
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Rutinas</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === AppTab.ROUTINES ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {routines.length}
                    </span>
                  </button>

                  <button
                    id="tab-nav-catalog"
                    type="button"
                    onClick={() => setActiveTab(AppTab.EXERCISES)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                      activeTab === AppTab.EXERCISES
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ejercicios</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === AppTab.EXERCISES ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {catalog.length}
                    </span>
                  </button>
                </nav>

                {/* Right: MENU BURGER */}
                <button
                  id="btn-open-sidebar-menu"
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 flex items-center justify-center transition-colors active:scale-95 shadow-2xs shrink-0"
                  title="Menú principal"
                  aria-label="Menú principal"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Active Workout Banner when browsing outside the active routine */}
          {inProgressSessionEntry && inProgressRoutine && (
            <ActiveWorkoutTopBanner
              routine={inProgressRoutine}
              session={inProgressSessionEntry}
              onOpenRoutine={() => {
                setActiveRoutineId(inProgressRoutine.id);
                setRoutineSubMode('execute');
              }}
            />
          )}

          {/* Mobile PWA Install Banner */}
          <PWAInstallBanner />

          {/* Active View Screen */}
          <main className="flex-1">
            {activeTab === AppTab.ROUTINES ? (
              <RoutineList
                routines={routines}
                activeSessions={activeSessions}
                onCreateRoutine={handleCreateRoutine}
                onSelectRoutine={handleSelectRoutine}
                onDuplicateRoutine={handleDuplicateRoutine}
                onDeleteRoutine={handleDeleteRoutine}
              />
            ) : activeTab === AppTab.EXERCISES ? (
              <ExerciseCatalog
                exercises={catalog}
                onCreateExercise={handleCreateCatalogExercise}
                onUpdateExercise={handleUpdateCatalogExercise}
                onDeleteExercise={handleDeleteCatalogExercise}
                onCheckRmWeight={handleCheckRmWeight}
              />
            ) : activeTab === AppTab.RMS ? (
              <RmLogsView
                catalog={catalog}
                rmLogs={rmLogs}
                onSaveRmLogs={setRmLogs}
                onGoToCatalog={() => setActiveTab(AppTab.EXERCISES)}
              />
            ) : (
              <WorkoutHistoryView
                historyLogs={workoutHistory}
                onDeleteLog={handleDeleteHistoryLog}
                onGoToRoutines={() => setActiveTab(AppTab.ROUTINES)}
              />
            )}
          </main>

          {/* Footer link for backup access */}
          <footer className="mt-auto py-6 px-4 text-center">
            <button
              id="btn-footer-backup-link"
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Copia de seguridad (Importar / Exportar JSON)</span>
            </button>
          </footer>
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
        onOpenBackup={() => setIsBackupModalOpen(true)}
      />

      {/* RM New Record Detection Alert Modal */}
      <RmRecordAlertModal
        isOpen={Boolean(pendingRmAlert)}
        exerciseName={pendingRmAlert?.exerciseName || ''}
        newWeight={pendingRmAlert?.newWeight || 0}
        previousRmWeight={pendingRmAlert?.previousRmWeight || 0}
        previousRmDate={pendingRmAlert?.previousRmDate}
        onConfirm={handleConfirmRmAlert}
        onClose={() => setPendingRmAlert(null)}
      />

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal
        summary={workoutSummary}
        onClose={() => setWorkoutSummary(null)}
      />

      {/* Import / Export Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        catalog={catalog}
        routines={routines}
        rmLogs={rmLogs}
        workoutHistory={workoutHistory}
        onImportComplete={handleImportComplete}
      />

      {/* Success / Feedback Toast Notification */}
      {importFeedback && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-zinc-950 text-white rounded-2xl shadow-xl border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{importFeedback}</span>
          <button
            type="button"
            onClick={() => setImportFeedback(null)}
            className="p-0.5 text-zinc-400 hover:text-white rounded"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
