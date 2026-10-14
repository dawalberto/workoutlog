import { useAppStore } from '../../store/appStore';
import {
  selectInProgressRoutine,
  selectInProgressSessionEntry,
} from '../../store/selectors';

export function useActiveWorkoutBanner() {
  const routine = useAppStore(selectInProgressRoutine);
  const session = useAppStore(selectInProgressSessionEntry);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const onOpenRoutine = () => {
    if (routine) selectRoutine(routine.id, 'execute');
  };

  return routine && session ? { routine, session, onOpenRoutine } : null;
}
