/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routine, RoutineSubMode, ViewMode } from './types';
import { INITIAL_ROUTINES } from './data/initialData';
import { RoutineList } from './components/RoutineList';
import { RoutineView } from './components/RoutineView';

const STORAGE_KEY = 'workout_planner_routines_v1';

export default function App() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return INITIAL_ROUTINES;
  });

  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [routineSubMode, setRoutineSubMode] = useState<RoutineSubMode>('edit');

  // Save to localStorage whenever routines change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    } catch (e) {
      console.error('Error saving routines to localStorage', e);
    }
  }, [routines]);

  // Create new routine
  const handleCreateRoutine = () => {
    const newRoutine: Routine = {
      id: 'routine-' + Date.now(),
      name: 'Nueva Rutina ' + (routines.length + 1),
      notes: '',
      exercises: [
        {
          id: 'ex-' + Date.now() + '-1',
          name: 'Press de Banca Plano',
          notes: 'Técnica controlada',
          videoUrl: '',
          sets: [
            { id: 'set-' + Date.now() + '-1', setNumber: 1, reps: 10, weight: 50, restSeconds: 90 },
            { id: 'set-' + Date.now() + '-2', setNumber: 2, reps: 10, weight: 50, restSeconds: 90 },
            { id: 'set-' + Date.now() + '-3', setNumber: 3, reps: 8, weight: 55, restSeconds: 90 },
          ],
        },
      ],
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

  // Reset to default sample routines
  const handleResetToDefaults = () => {
    setRoutines(INITIAL_ROUTINES);
  };

  const activeRoutine = routines.find((r) => r.id === activeRoutineId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {activeRoutineId && activeRoutine ? (
        <RoutineView
          routine={activeRoutine}
          initialMode={routineSubMode}
          onSaveRoutine={handleSaveRoutine}
          onBack={() => setActiveRoutineId(null)}
        />
      ) : (
        <RoutineList
          routines={routines}
          onCreateRoutine={handleCreateRoutine}
          onSelectRoutine={handleSelectRoutine}
          onDuplicateRoutine={handleDuplicateRoutine}
          onDeleteRoutine={handleDeleteRoutine}
          onResetToDefaults={handleResetToDefaults}
        />
      )}
    </div>
  );
}
