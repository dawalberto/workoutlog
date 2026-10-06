import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, X, Plus, Bell } from 'lucide-react';
import { formatStopwatch } from '../utils/timeCalculations';
import { playTimerFinishBeep, triggerTimerVibration } from '../utils/audioBeep';

interface RestTimerBarProps {
  initialSeconds: number;
  exerciseName?: string;
  setNumber?: number;
  onClose: () => void;
}

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
  initialSeconds,
  exerciseName,
  setNumber,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  // Synchronous ref to prevent double-firing
  const hasFinishedRef = useRef<boolean>(false);

  // Accurate target timestamp (wall-clock ms since epoch)
  const targetEndTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const remainingWhenPausedRef = useRef<number>(initialSeconds * 1000);
  const workerRef = useRef<Worker | null>(null);

  const handleFinish = useCallback((shouldPlaySound: boolean = false) => {
    // Strictly execute only once per timer run
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setHasFinished(true);
    setSecondsLeft(0);

    // Only play sound & vibration if the user was actively inside the app when it ended.
    // No push notification, no background wake, no music interruption.
    if (shouldPlaySound) {
      playTimerFinishBeep();
      triggerTimerVibration();
    }
  }, []);

  // Update check based on real wall-clock time
  const checkTick = useCallback(() => {
    if (isPaused || hasFinishedRef.current) return;
    const now = Date.now();
    const remainingMs = targetEndTimeRef.current - now;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    setSecondsLeft(remainingSec);

    if (remainingMs <= 0) {
      // If the app is active/visible and the timer finished just now (not hours/minutes ago in background)
      const isInsideApp = typeof document !== 'undefined' && !document.hidden;
      const wasJustReached = remainingMs > -1500;
      handleFinish(isInsideApp && wasJustReached);
    }
  }, [isPaused, handleFinish]);

  // Reset when initialSeconds or exercise/set changes
  useEffect(() => {
    hasFinishedRef.current = false;
    const target = Date.now() + initialSeconds * 1000;
    targetEndTimeRef.current = target;
    remainingWhenPausedRef.current = initialSeconds * 1000;
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsPaused(false);
    setHasFinished(false);
  }, [initialSeconds, exerciseName, setNumber]);

  // Setup ticking Web Worker + fallback interval + Page Visibility / Focus listeners
  useEffect(() => {
    if (isPaused || hasFinished) return;

    let worker: Worker | null = null;
    try {
      const workerBlob = new Blob(
        [
          `
          let interval = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (interval) clearInterval(interval);
              interval = setInterval(function() {
                self.postMessage('tick');
              }, 400);
            } else if (e.data === 'stop') {
              if (interval) clearInterval(interval);
              interval = null;
            }
          };
        `,
        ],
        { type: 'application/javascript' }
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      worker = new Worker(workerUrl);
      workerRef.current = worker;

      worker.onmessage = () => {
        checkTick();
      };
      worker.postMessage('start');
    } catch {
      // Fallback handled below
    }

    // Interval in main thread as redundancy
    const fallbackInterval = setInterval(checkTick, 400);

    // Sync immediately when app gains focus or tab becomes visible again
    const onVisibilityChange = () => {
      checkTick();
    };
    const onFocus = () => {
      checkTick();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
        workerRef.current = null;
      }
      clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [isPaused, hasFinished, checkTick]);

  // Handle Pause / Resume
  const togglePause = () => {
    if (isPaused) {
      // Resuming
      const target = Date.now() + remainingWhenPausedRef.current;
      targetEndTimeRef.current = target;
      setIsPaused(false);
    } else {
      // Pausing
      remainingWhenPausedRef.current = Math.max(0, targetEndTimeRef.current - Date.now());
      setIsPaused(true);
    }
  };

  // Handle Add Extra Time (+30s)
  const addExtraTime = (extra: number) => {
    hasFinishedRef.current = false;

    if (hasFinished) {
      const target = Date.now() + extra * 1000;
      targetEndTimeRef.current = target;
      setSecondsLeft(extra);
      setTotalSeconds(extra);
      setHasFinished(false);
      setIsPaused(false);
    } else if (isPaused) {
      remainingWhenPausedRef.current += extra * 1000;
      const newSec = Math.ceil(remainingWhenPausedRef.current / 1000);
      setSecondsLeft(newSec);
      setTotalSeconds((prev) => Math.max(prev, newSec));
    } else {
      const target = targetEndTimeRef.current + extra * 1000;
      targetEndTimeRef.current = target;
      const newRemainingSec = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(newRemainingSec);
      setTotalSeconds((prev) => Math.max(prev, newRemainingSec));
    }
  };

  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
      : 0;

  return (
    <div
      id="floating-rest-timer"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 transition-all duration-300 animate-slide-up"
    >
      <div
        className={`rounded-2xl border shadow-2xl p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 ${
          hasFinished
            ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_10px_40px_rgba(0,255,135,0.4)]'
            : 'bg-[#18181A]/95 text-white border-[#00FF87]/30 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(0,255,135,0.15)]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasFinished ? 'bg-black animate-ping' : 'bg-[#00FF87] animate-pulse shadow-[0_0_8px_#00FF87]'
              }`}
            />
            <div className="truncate flex items-center gap-2">
              <span className={`text-[11px] font-black tracking-wider uppercase block truncate ${hasFinished ? 'text-black' : 'text-[#00FF87]'}`}>
                {hasFinished ? '¡Tiempo terminado!' : 'Descanso en curso'}
              </span>
              {exerciseName && (
                <span className={`text-xs truncate block font-semibold ${hasFinished ? 'text-black/80' : 'text-[#A1A1AA]'}`}>
                  {exerciseName} {setNumber ? `• Serie ${setNumber}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-close-rest-timer"
              type="button"
              onClick={onClose}
              aria-label="Cerrar temporizador"
              className={`p-1.5 rounded-xl transition-colors ${
                hasFinished ? 'text-black/60 hover:text-black hover:bg-black/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${hasFinished ? 'text-black' : 'text-white'}`}>
              {formatStopwatch(secondsLeft)}
            </span>
            {hasFinished && (
              <span className="text-xs font-black flex items-center gap-1 text-black bg-black/15 px-2.5 py-0.5 rounded-full">
                <Bell className="w-3.5 h-3.5" /> ¡A por la siguiente!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-add-30s-rest"
              type="button"
              onClick={() => addExtraTime(30)}
              className={`min-h-[44px] px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 ${
                hasFinished
                  ? 'bg-black/15 hover:bg-black/25 text-black'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> 30s
            </button>

            {!hasFinished && (
              <button
                id="btn-pause-rest-timer"
                type="button"
                onClick={togglePause}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all active:scale-95 flex items-center justify-center"
                title={isPaused ? 'Continuar' : 'Pausar'}
              >
                {isPaused ? (
                  <Play className="w-4 h-4 fill-current text-[#00FF87]" />
                ) : (
                  <Pause className="w-4 h-4 fill-current" />
                )}
              </button>
            )}

            <button
              id="btn-skip-rest-timer"
              type="button"
              onClick={onClose}
              className={`min-h-[44px] px-4 text-xs font-black rounded-xl transition-all active:scale-95 ${
                hasFinished
                  ? 'bg-black text-white hover:bg-zinc-900 shadow-md'
                  : 'bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.4)]'
              }`}
            >
              {hasFinished ? 'Listo' : 'Saltar'}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all duration-300 ${
              hasFinished ? 'bg-black' : 'bg-[#00FF87] shadow-[0_0_10px_#00FF87]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
