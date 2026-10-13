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
    activeSessions,
    rmLogs,
    workoutHistory,
    exerciseDiary,
    setRmLogs,
    setExerciseDiary,
    createRoutine,
    selectRoutine,
    duplicateRoutine,
    deleteRoutine,
    createCatalogExercise,
    updateCatalogExercise,
    deleteCatalogExercise,
    checkRmWeight,
    openDiary,
    deleteHistoryLog,
    diaryTargetExerciseName,
    diaryAutoOpenCreate,
    clearDiaryNavigationState,
    onGoToCatalog,
    onGoToRoutines,
  } = useTabContent();

  return activeTab === AppTab.ROUTINES ? (
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
      onGoToCatalog={onGoToCatalog}
    />
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
