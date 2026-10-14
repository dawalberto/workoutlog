/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoutineViewState } from '../hooks/useRoutineViewState';
import { RoutineHeader } from './routine/RoutineHeader';
import { WorkoutProgressPanel } from './routine/WorkoutProgressPanel';
import { RoutineExerciseList } from './routine/RoutineExerciseList';

export const RoutineView: React.FC = () => {
  const viewState = useRoutineViewState();
  if (!viewState.routine) return null;

  return (
    <div id="routine-view-container" className="min-h-screen bg-[#0D0D0D] text-white pb-32">
      <RoutineHeader
        subMode={viewState.subMode}
        elapsedSeconds={viewState.elapsedSeconds}
        routineFieldProps={viewState.routineFieldProps}
        progress={viewState.subMode === 'execute'
          ? <WorkoutProgressPanel elapsedSeconds={viewState.elapsedSeconds} />
          : null}
      >
        <RoutineExerciseList
          viewState={{
            collapsedExerciseIds: viewState.collapsedExerciseIds,
            setCollapsedExerciseIds: viewState.setCollapsedExerciseIds,
            onToggleCollapseExercise: viewState.handleToggleCollapseExercise,
          }}
        />
      </RoutineHeader>
    </div>
  );
};
