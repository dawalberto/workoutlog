import type { AppState } from './appStore';
import { getStorageScopeKey } from './persistence';

const EMPTY_DATA: Pick<
  AppState,
  'routines' | 'catalog' | 'activeSessions' | 'rmLogs' | 'workoutHistory' | 'exerciseDiary'
> = {
  routines: [],
  catalog: [],
  activeSessions: {},
  rmLogs: [],
  workoutHistory: [],
  exerciseDiary: [],
};

export function selectIsStorageReady(state: AppState): boolean {
  const expectedScopeKey = getStorageScopeKey(state.user?.id);
  return state.isStorageLoaded &&
    state.activeScopeKey === expectedScopeKey &&
    state.hydratedScopeKey === expectedScopeKey;
}

export function selectIsInitialSyncSettled(state: AppState): boolean {
  const ownerId = state.user?.id;
  return Boolean(ownerId) && state.initialSyncSettledOwnerId === ownerId;
}

export function selectPersistedData(state: AppState) {
  const isStorageLoaded = selectIsStorageReady(state);
  return {
    routines: isStorageLoaded ? state.routines : EMPTY_DATA.routines,
    setRoutines: state.setRoutines,
    catalog: isStorageLoaded ? state.catalog : EMPTY_DATA.catalog,
    setCatalog: state.setCatalog,
    activeSessions: isStorageLoaded ? state.activeSessions : EMPTY_DATA.activeSessions,
    setActiveSessions: state.setActiveSessions,
    rmLogs: isStorageLoaded ? state.rmLogs : EMPTY_DATA.rmLogs,
    setRmLogs: state.setRmLogs,
    workoutHistory: isStorageLoaded ? state.workoutHistory : EMPTY_DATA.workoutHistory,
    setWorkoutHistory: state.setWorkoutHistory,
    exerciseDiary: isStorageLoaded ? state.exerciseDiary : EMPTY_DATA.exerciseDiary,
    setExerciseDiary: state.setExerciseDiary,
    isStorageLoaded,
    isGuestTransferComplete: state.isGuestTransferComplete,
    storageError: isStorageLoaded ? state.storageError : null,
  };
}

export function selectActiveRoutine(state: AppState) {
  return state.routines.find((routine) => routine.id === state.activeRoutineId);
}

export function selectInProgressSessionEntry(state: AppState) {
  return Object.values(state.activeSessions).find(
    (session) => session.startTime && session.routineId !== state.activeRoutineId,
  );
}

export function selectInProgressRoutine(state: AppState) {
  const session = selectInProgressSessionEntry(state);
  return session
    ? state.routines.find((routine) => routine.id === session.routineId) || null
    : null;
}
