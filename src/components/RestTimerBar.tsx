import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, X, Plus, Bell } from 'lucide-react';
import { formatStopwatch } from '../utils/timeCalculations';
import {
  playTimerFinishBeep,
  scheduleTimerFinishBeep,
  triggerTimerVibration,
  showTimerFinishNotification,
} from '../utils/audioBeep';

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

  // Accurate target timestamp (ms since epoch)
  const targetEndTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const remainingWhenPausedRef = useRef<number>(initialSeconds * 1000);
  const scheduledAudioCancelRef = useRef<(() => void) | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const handleFinish = useCallback(() => {
    setHasFinished(true);
    setSecondsLeft(0);
    // 1. Play finish chime
    playTimerFinishBeep();
    // 2. Trigger device vibration
    triggerTimerVibration();
    // 3. Post system notification with vibration and alert
    showTimerFinishNotification(exerciseName, setNumber);
  }, [exerciseName, setNumber]);

  // Schedule audio chime whenever active and running
  const scheduleAudio = useCallback((remainingSeconds: number) => {
    if (scheduledAudioCancelRef.current) {
      scheduledAudioCancelRef.current();
      scheduledAudioCancelRef.current = null;
    }
    if (remainingSeconds > 0) {
      scheduledAudioCancelRef.current = scheduleTimerFinishBeep(remainingSeconds);
    }
  }, []);

  // Update check based on wall-clock time
  const checkTick = useCallback(() => {
    if (isPaused || hasFinished) return;
    const now = Date.now();
    const remainingMs = targetEndTimeRef.current - now;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    setSecondsLeft(remainingSec);

    if (remainingMs <= 0 && !hasFinished) {
      handleFinish();
    }
  }, [isPaused, hasFinished, handleFinish]);

  // Reset when initialSeconds changes
  useEffect(() => {
    targetEndTimeRef.current = Date.now() + initialSeconds * 1000;
    remainingWhenPausedRef.current = initialSeconds * 1000;
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsPaused(false);
    setHasFinished(false);

    scheduleAudio(initialSeconds);

    return () => {
      if (scheduledAudioCancelRef.current) {
        scheduledAudioCancelRef.current();
        scheduledAudioCancelRef.current = null;
      }
    };
  }, [initialSeconds, scheduleAudio]);

  // Setup inline background Web Worker + Page Visibility listeners
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
      targetEndTimeRef.current = Date.now() + remainingWhenPausedRef.current;
      setIsPaused(false);
      const remainingSec = Math.max(0, Math.ceil(remainingWhenPausedRef.current / 1000));
      scheduleAudio(remainingSec);
    } else {
      // Pausing
      remainingWhenPausedRef.current = Math.max(0, targetEndTimeRef.current - Date.now());
      setIsPaused(true);
      if (scheduledAudioCancelRef.current) {
        scheduledAudioCancelRef.current();
        scheduledAudioCancelRef.current = null;
      }
    }
  };

  // Handle Add Extra Time (+30s)
  const addExtraTime = (extra: number) => {
    if (hasFinished) {
      targetEndTimeRef.current = Date.now() + extra * 1000;
      setSecondsLeft(extra);
      setTotalSeconds(extra);
      setHasFinished(false);
      setIsPaused(false);
      scheduleAudio(extra);
    } else if (isPaused) {
      remainingWhenPausedRef.current += extra * 1000;
      const newSec = Math.ceil(remainingWhenPausedRef.current / 1000);
      setSecondsLeft(newSec);
      setTotalSeconds((prev) => Math.max(prev, newSec));
    } else {
      targetEndTimeRef.current += extra * 1000;
      const newRemainingSec = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(newRemainingSec);
      setTotalSeconds((prev) => Math.max(prev, newRemainingSec));
      scheduleAudio(newRemainingSec);
    }
  };

  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
      : 0;

  return (
    <div
      id="floating-rest-timer"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 transition-all duration-300"
    >
      <div
        className={`rounded-2xl border shadow-xl p-4 backdrop-blur-md transition-colors ${
          hasFinished
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
            : 'bg-zinc-900/95 text-zinc-100 border-zinc-700/80 shadow-black/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasFinished ? 'bg-white animate-ping' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <div className="truncate">
              <span className="text-xs font-semibold tracking-wide uppercase opacity-80 block truncate">
                {hasFinished ? '¡Tiempo de descanso terminado!' : 'Descanso en curso'}
              </span>
              {exerciseName && (
                <span className="text-xs opacity-90 truncate block">
                  {exerciseName} {setNumber ? `• Serie ${setNumber}` : ''}
                </span>
              )}
            </div>
          </div>

          <button
            id="btn-close-rest-timer"
            type="button"
            onClick={onClose}
            aria-label="Cerrar temporizador"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight">
              {formatStopwatch(secondsLeft)}
            </span>
            {hasFinished && (
              <span className="text-xs font-semibold flex items-center gap-1 text-white bg-white/20 px-2 py-0.5 rounded-full">
                <Bell className="w-3 h-3" /> ¡A por la siguiente!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-add-30s-rest"
              type="button"
              onClick={() => addExtraTime(30)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> 30s
            </button>

            {!hasFinished && (
              <button
                id="btn-pause-rest-timer"
                type="button"
                onClick={togglePause}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
                title={isPaused ? 'Continuar' : 'Pausar'}
              >
                {isPaused ? (
                  <Play className="w-4 h-4 fill-current" />
                ) : (
                  <Pause className="w-4 h-4 fill-current" />
                )}
              </button>
            )}

            <button
              id="btn-skip-rest-timer"
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors active:scale-95 ${
                hasFinished
                  ? 'bg-white text-emerald-800 hover:bg-zinc-100 font-bold'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
              }`}
            >
              {hasFinished ? 'Listo' : 'Saltar'}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all duration-300 ${
              hasFinished ? 'bg-white' : 'bg-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
