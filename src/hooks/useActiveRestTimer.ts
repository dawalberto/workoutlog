import { useState } from 'react';
import type { ActiveRestTimer } from '../types';
import {
  clearActiveRestTimer,
  loadActiveRestTimer,
  saveActiveRestTimer,
} from '../utils/restTimer';

export function useActiveRestTimer() {
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(
    () => loadActiveRestTimer(),
  );

  const handleStartRestTimer = (timer: ActiveRestTimer) => {
    setActiveRestTimer(timer);
    saveActiveRestTimer(timer);
  };

  const handleCloseRestTimer = () => {
    setActiveRestTimer(null);
    clearActiveRestTimer();
  };

  return { activeRestTimer, handleStartRestTimer, handleCloseRestTimer };
}
