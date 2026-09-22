/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Flame, Dumbbell, ArrowDownUp, CheckCircle2, X } from 'lucide-react';
import { Routine, RoutineSubMode, ExerciseDefinition, AppTab } from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DataBackupModal } from './components/DataBackupModal';
import { normalizeExerciseTitle } from './utils/backup';

const ROUTINES_STORAGE_KEY = 'workout_planner_routines_v2';
const CATALOG_STORAGE_KEY = 'workout_planner_catalog_v2';

export default function App() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      // Clear legacy storage keys with example data
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
      // Clear legacy storage keys with example data
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

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ROUTINES);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [routineSubMode, setRoutineSubMode] = useState<RoutineSubMode>('edit');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

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

  // Catalog CRUD handlers
  const handleCreateCatalogExercise = (exercise: ExerciseDefinition) => {
    setCatalog((prev) => {
      // Avoid duplicate by id
      const exists = prev.some((e) => e.id === exercise.id);
      if (exists) {
        return prev.map((e) => (e.id === exercise.id ? exercise : e));
      }
      return [exercise, ...prev];
    });
  };

  const handleUpdateCatalogExercise = (exercise: ExerciseDefinition) => {
    // 1. Get old definition to match by previous title if definitionId was not set yet
    const oldDef = catalog.find((e) => e.id === exercise.id);
    const oldNorm = oldDef ? normalizeExerciseTitle(oldDef.name) : '';
    const newNorm = normalizeExerciseTitle(exercise.name);

    // 2. Update catalog
    setCatalog((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)));

    // 3. Update all routines that contain this exercise
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
    }
  };

  // Complete data import
  const handleImportComplete = (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    summary: {
      exercisesAdded: number;
      exercisesReplaced: number;
      routinesAdded: number;
      exercisesInRoutinesUpdated?: number;
      mode: 'merge' | 'overwrite';
    }
  ) => {
    setCatalog(newCatalog);
    setRoutines(newRoutines);

    let msg = '';
    if (summary.mode === 'overwrite') {
      msg = `Copia restaurada: ${newCatalog.length} ejercicios y ${newRoutines.length} rutinas guardadas.`;
    } else {
      const parts: string[] = [];
      if (summary.exercisesAdded > 0) parts.push(`${summary.exercisesAdded} ejerc. añadidos`);
      if (summary.exercisesReplaced > 0) parts.push(`${summary.exercisesReplaced} ejerc. actualizados`);
      if (summary.exercisesInRoutinesUpdated && summary.exercisesInRoutinesUpdated > 0) {
        parts.push(`${summary.exercisesInRoutinesUpdated} en rutinas`);
      }
      if (summary.routinesAdded > 0) parts.push(`${summary.routinesAdded} rutinas añadidas`);
      msg = parts.length > 0
        ? `Importación completada: ${parts.join(', ')}.`
        : 'Datos combinados con éxito.';
    }
    setImportFeedback(msg);
    setTimeout(() => setImportFeedback(null), 5000);
  };

  const activeRoutine = routines.find((r) => r.id === activeRoutineId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {activeRoutineId && activeRoutine ? (
        <RoutineView
          routine={activeRoutine}
          catalog={catalog}
          initialMode={routineSubMode}
          onSaveRoutine={handleSaveRoutine}
          onSaveToCatalog={handleCreateCatalogExercise}
          onBack={() => setActiveRoutineId(null)}
        />
      ) : (
        <div className="overflow-x-hidden flex flex-col min-h-screen">
          {/* Main Top Navigation Bar */}
          <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 shadow-2xs">
            <div className="max-w-4xl mx-auto px-3 sm:px-6">
              <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
                {/* Brand / Logo */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 fill-current" />
                  </span>
                  <div>
                    <span className="text-sm sm:text-base font-black tracking-tight text-zinc-900 block leading-tight">
                      WorkoutLog
                    </span>
                    <span className="hidden sm:block text-[10px] text-zinc-500 -mt-0.5 font-medium">
                      Planificador & Ejecutor
                    </span>
                  </div>
                </div>

                {/* Right controls: Main Views Navigation + Subtle Backup Icon + PWA Install */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <nav className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 shrink-0">
                    <button
                      id="tab-nav-routines"
                      type="button"
                      onClick={() => setActiveTab(AppTab.ROUTINES)}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 ${
                        activeTab === AppTab.ROUTINES
                          ? 'bg-white text-zinc-900 shadow-xs'
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
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 ${
                        activeTab === AppTab.EXERCISES
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><span className="hidden sm:inline">Biblioteca </span>Ejercicios</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeTab === AppTab.EXERCISES ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {catalog.length}
                      </span>
                    </button>
                  </nav>

                  {/* Subtle Backup / Data Button */}
                  <button
                    id="btn-open-backup-modal"
                    type="button"
                    onClick={() => setIsBackupModalOpen(true)}
                    className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 active:scale-95 transition-colors shrink-0"
                    title="Copia de seguridad (Importar / Exportar datos)"
                    aria-label="Copia de seguridad (Importar / Exportar datos)"
                  >
                    <ArrowDownUp className="w-4 h-4" />
                  </button>

                  <PWAInstallButton />
                </div>
              </div>
            </div>
          </header>

          {/* Mobile PWA Install Banner */}
          <PWAInstallBanner />

          {/* Active View Screen */}
          <main className="flex-1">
            {activeTab === AppTab.ROUTINES ? (
              <RoutineList
                routines={routines}
                onCreateRoutine={handleCreateRoutine}
                onSelectRoutine={handleSelectRoutine}
                onDuplicateRoutine={handleDuplicateRoutine}
                onDeleteRoutine={handleDeleteRoutine}
              />
            ) : (
              <ExerciseCatalog
                exercises={catalog}
                onCreateExercise={handleCreateCatalogExercise}
                onUpdateExercise={handleUpdateCatalogExercise}
                onDeleteExercise={handleDeleteCatalogExercise}
              />
            )}
          </main>

          {/* Subtle footer link for non-intrusive backup access */}
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

      {/* Import / Export Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        catalog={catalog}
        routines={routines}
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
