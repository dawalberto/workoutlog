import { useState, useEffect } from 'react';

/**
 * Custom hook that provides an absolute, infallible workout elapsed time in seconds.
 * Based on epoch timestamp diff (Date.now() - startTime).
 * Continues perfectly even across screen locks, backgrounding, and tab switching.
 */
export function useWorkoutTimer(startTime: number | null | undefined): number {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  });

  useEffect(() => {
    if (!startTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(elapsed);
    };

    // Immediate sync
    updateTimer();

    // 1-second interval for smooth UI ticking
    const interval = setInterval(updateTimer, 1000);

    // Immediate sync on tab visibility or window focus (e.g. unlocking phone)
    const handleVisibilityChange = () => {
      updateTimer();
    };
    const handleFocus = () => {
      updateTimer();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [startTime]);

  return elapsedSeconds;
}
