import React from 'react';
import { AppTab } from '../types';
import { useTabContent } from '../hooks/shell/useTabContent';
import { ExerciseCatalog } from './ExerciseCatalog';
import { ExerciseDiaryView } from './ExerciseDiaryView';
import { RmLogsView } from './RmLogsView';
import { RoutineList } from './RoutineList';
import { WorkoutHistoryView } from './WorkoutHistoryView';

export const TabContent: React.FC = () => {
  const {
    activeTab,
    routines,
    catalog,
    rmLogs,
    workoutHistory,
    setExerciseDiary,
    deleteHistoryLog,
    diaryTargetExerciseName,
    diaryAutoOpenCreate,
    clearDiaryNavigationState,
    onGoToRoutines,
    onGoToCatalog,
    exerciseDiary,
  } = useTabContent();

  return activeTab === AppTab.ROUTINES ? (
    <RoutineList />
  ) : activeTab === AppTab.EXERCISES ? (
    <ExerciseCatalog />
  ) : activeTab === AppTab.RMS ? (
    <RmLogsView />
  ) : activeTab === AppTab.HISTORY ? (
    <WorkoutHistoryView
      historyLogs={workoutHistory}
      rmLogs={rmLogs}
      routines={routines}
      catalog={catalog}
      onDeleteLog={deleteHistoryLog}
      onGoToRoutines={onGoToRoutines}
    />
  ) : (
    <ExerciseDiaryView
      catalog={catalog}
      diaries={exerciseDiary}
      onSaveDiaries={setExerciseDiary}
      onGoToCatalog={onGoToCatalog}
      initialExerciseName={diaryTargetExerciseName}
      autoOpenCreate={diaryAutoOpenCreate}
      onClearInitialState={clearDiaryNavigationState}
    />
  );
};
