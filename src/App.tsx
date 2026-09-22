/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Flame, Dumbbell } from 'lucide-react';
import { Routine, RoutineSubMode, ExerciseDefinition, AppTab } from './types';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { PWAInstallButton } from './components/PWAInstallButton';

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
    setCatalog((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)));
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

  const activeRoutine = routines.find((r) => r.id === activeRoutineId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
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
        <div>
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

                {/* Right controls: Main Views Navigation + PWA Install */}
                <div className="flex items-center gap-2">
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

                  <PWAInstallButton />
                </div>
              </div>
            </div>
          </header>

          {/* Active View Screen */}
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
        </div>
      )}
    </div>
  );
}
