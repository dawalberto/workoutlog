import { useAppStore } from '../../store/appStore';

export function useRestTimerBar() {
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const activeRoutineId = useAppStore((state) => state.activeRoutineId);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const onClose = useAppStore((state) => state.closeRestTimer);
  const onPause = useAppStore((state) => state.pauseRestTimer);
  const onResume = useAppStore((state) => state.resumeRestTimer);
  const onExtend = useAppStore((state) => state.extendRestTimer);
  const restPushArmed = useAppStore((state) => state.restPush.armed);

  return activeRestTimer
    ? {
      activeRestTimer,
      isInsideActiveRoutine: Boolean(activeRoutineId),
      onReturnToRoutine: () => selectRoutine(activeRestTimer.routineId, 'execute'),
      onClose,
      onPause,
      onResume,
      onExtend,
      restPushArmed,
    }
    : null;
}
