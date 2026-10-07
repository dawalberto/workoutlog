import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, X, Plus, Bell, RotateCcw } from 'lucide-react';
import { formatStopwatch } from '../utils/timeCalculations';
import { playTimerFinishBeep, triggerTimerVibration } from '../utils/audioBeep';

interface RestTimerBarProps {
  initialSeconds: number;
  targetEndTime?: number;
  exerciseName?: string;
  setNumber?: number;
  isInsideActiveRoutine?: boolean;
  onReturnToRoutine?: () => void;
  onClose: () => void;
}

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
  initialSeconds,
  targetEndTime,
  exerciseName,
  setNumber,
  isInsideActiveRoutine = true,
  onReturnToRoutine,
  onClose,
}) => {
  // Compute initial remaining time based on targetEndTime if available
  const getInitialRemaining = () => {
    if (targetEndTime) {
      const diff = targetEndTime - Date.now();
      return Math.max(0, Math.ceil(diff / 1000));
    }
    return initialSeconds;
  };

  const initialRemainingSec = getInitialRemaining();
  const [secondsLeft, setSecondsLeft] = useState<number>(initialRemainingSec);
  const [totalSeconds, setTotalSeconds] = useState<number>(Math.max(initialSeconds, initialRemainingSec));
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(initialRemainingSec <= 0);

  // Synchronous ref to prevent double-firing sound/vibration
  const hasFinishedRef = useRef<boolean>(initialRemainingSec <= 0);

  // Accurate target timestamp (wall-clock ms since epoch)
  const targetEndTimeRef = useRef<number>(
    targetEndTime && targetEndTime > Date.now()
      ? targetEndTime
      : Date.now() + initialSeconds * 1000
  );
  const remainingWhenPausedRef = useRef<number>(initialRemainingSec * 1000);
  const workerRef = useRef<Worker | null>(null);

  const handleFinish = useCallback((shouldPlaySound: boolean = true) => {
    // Strictly execute only once per timer run
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setHasFinished(true);
    setSecondsLeft(0);

    // Audio and haptic vibration feedback
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
      handleFinish(true);
    }
  }, [isPaused, handleFinish]);

  // Reset when initialSeconds, targetEndTime, or exercise/set changes
  useEffect(() => {
    const target =
      targetEndTime && targetEndTime > Date.now()
        ? targetEndTime
        : Date.now() + initialSeconds * 1000;

    targetEndTimeRef.current = target;
    const now = Date.now();
    const remainingMs = target - now;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

    remainingWhenPausedRef.current = Math.max(0, remainingMs);
    setSecondsLeft(remainingSec);
    setTotalSeconds((prev) => Math.max(prev, initialSeconds, remainingSec));
    setIsPaused(false);

    if (remainingSec <= 0) {
      hasFinishedRef.current = true;
      setHasFinished(true);
    } else {
      hasFinishedRef.current = false;
      setHasFinished(false);
    }
  }, [initialSeconds, targetEndTime, exerciseName, setNumber]);

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

  // Mini reduced pill banner when viewing outside active training (e.g. Diario, Historial, Catálogo)
  if (!isInsideActiveRoutine) {
    return (
      <div
        id="floating-mini-rest-timer"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 animate-slide-up pointer-events-auto max-w-[calc(100%-1.5rem)]"
      >
        <div
          className={`rounded-full border shadow-2xl px-3.5 sm:px-4 py-2 backdrop-blur-2xl flex items-center gap-2.5 sm:gap-3 transition-all duration-300 ${
            hasFinished
              ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_8px_30px_rgba(0,255,135,0.45)]'
              : 'bg-[#18181A]/95 text-white border-[#00FF87]/40 shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(0,255,135,0.2)]'
          }`}
        >
          {/* Pulsing state dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              hasFinished ? 'bg-black animate-ping' : 'bg-[#00FF87] animate-pulse shadow-[0_0_8px_#00FF87]'
            }`}
          />

          {/* Time digits & tiny title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                hasFinished ? 'text-black' : 'text-[#00FF87]'
              }`}
            >
              {hasFinished ? '¡Listo!' : 'Descanso'}
            </span>
            <span
              className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                hasFinished ? 'text-black' : 'text-white'
              }`}
            >
              {formatStopwatch(secondsLeft)}
            </span>
          </div>

          {exerciseName && (
            <span
              className={`text-xs truncate max-w-[90px] sm:max-w-[130px] font-semibold hidden xs:inline ${
                hasFinished ? 'text-black/80' : 'text-zinc-400'
              }`}
            >
              {exerciseName}
            </span>
          )}

          <div className="w-px h-4 bg-white/10 shrink-0" />

          {/* Volver button to return directly to the workout routine */}
          {onReturnToRoutine && (
            <button
              id="btn-mini-return-routine"
              type="button"
              onClick={onReturnToRoutine}
              className={`px-3 py-1 text-xs font-black rounded-full transition-all flex items-center gap-1 active:scale-95 shrink-0 shadow-sm ${
                hasFinished
                  ? 'bg-black text-white hover:bg-zinc-900'
                  : 'bg-[#00FF87] text-black hover:bg-[#00e57a] shadow-[0_0_10px_rgba(0,255,135,0.3)]'
              }`}
              title="Volver a la rutina"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.5]" />
              <span>Volver</span>
            </button>
          )}

          {/* Close button */}
          <button
            id="btn-mini-close-timer"
            type="button"
            onClick={onClose}
            aria-label="Cerrar temporizador"
            className={`p-1 rounded-full transition-colors active:scale-95 shrink-0 ${
              hasFinished ? 'text-black/70 hover:text-black hover:bg-black/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full detailed banner when inside active routine
  return (
    <div
      id="floating-rest-timer"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-lg z-50 transition-all duration-300 animate-slide-up pointer-events-auto"
    >
      <div
        className={`rounded-2xl border shadow-2xl p-3.5 sm:p-5 backdrop-blur-2xl transition-all duration-300 overflow-hidden ${
          hasFinished
            ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_10px_40px_rgba(0,255,135,0.45)]'
            : 'bg-[#18181A]/95 text-white border-[#00FF87]/30 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(0,255,135,0.15)]'
        }`}
      >
        {/* Header line: Title, subtitle & close/return buttons */}
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                hasFinished ? 'bg-black animate-ping' : 'bg-[#00FF87] animate-pulse shadow-[0_0_8px_#00FF87]'
              }`}
            />
            <div className="truncate flex items-center gap-2 min-w-0">
              <span className={`text-[11px] font-black tracking-wider uppercase shrink-0 ${hasFinished ? 'text-black' : 'text-[#00FF87]'}`}>
                {hasFinished ? '¡Tiempo terminado!' : 'Descanso en curso'}
              </span>
              {exerciseName && (
                <span className={`text-xs truncate font-semibold ${hasFinished ? 'text-black/80' : 'text-[#A1A1AA]'}`}>
                  {exerciseName} {setNumber ? `• S${setNumber}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* If outside active routine, show quick return button */}
            {!isInsideActiveRoutine && onReturnToRoutine && (
              <button
                type="button"
                onClick={onReturnToRoutine}
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 active:scale-95 ${
                  hasFinished
                    ? 'bg-black text-white hover:bg-zinc-900 shadow-sm'
                    : 'bg-[#00FF87]/20 text-[#00FF87] hover:bg-[#00FF87]/30 border border-[#00FF87]/30'
                }`}
                title="Volver a la rutina"
              >
                <span>Volver</span>
              </button>
            )}

            <button
              id="btn-close-rest-timer"
              type="button"
              onClick={onClose}
              aria-label="Cerrar temporizador"
              className={`p-1.5 rounded-xl transition-colors active:scale-95 ${
                hasFinished ? 'text-black/70 hover:text-black hover:bg-black/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Row: Stopwatch on left, Actions perfectly aligned on right */}
        <div className="flex items-center justify-between gap-2.5 py-0.5">
          {/* Stopwatch & status badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight shrink-0 ${
                hasFinished ? 'text-black' : 'text-white'
              }`}
            >
              {formatStopwatch(secondsLeft)}
            </span>
            {hasFinished && (
              <span className="hidden xs:inline-flex items-center gap-1 text-[11px] font-extrabold text-black bg-black/15 px-2.5 py-1 rounded-full truncate">
                <Bell className="w-3.5 h-3.5 shrink-0" /> ¡A por la siguiente!
              </span>
            )}
          </div>

          {/* Action buttons with guaranteed shrink-0 containment and touch targets */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-add-30s-rest"
              type="button"
              onClick={() => addExtraTime(30)}
              className={`min-h-[44px] px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0 ${
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
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all active:scale-95 flex items-center justify-center shrink-0"
                title={isPaused ? 'Continuar' : 'Pausar'}
                aria-label={isPaused ? 'Continuar descanso' : 'Pausar descanso'}
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
              className={`min-h-[44px] px-4 sm:px-5 text-xs font-black rounded-xl transition-all active:scale-95 shrink-0 inline-flex items-center justify-center ${
                hasFinished
                  ? 'bg-black text-white hover:bg-zinc-900 shadow-md ring-1 ring-black/20'
                  : 'bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.4)]'
              }`}
            >
              {hasFinished ? 'Listo' : 'Saltar'}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2.5">
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
