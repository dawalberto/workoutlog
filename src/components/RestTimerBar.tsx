import React, { useEffect, useState } from 'react';
import { Play, Pause, X, Plus, Bell } from 'lucide-react';
import { formatStopwatch } from '../utils/timeCalculations';
import { playTimerFinishBeep } from '../utils/audioBeep';

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

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsPaused(false);
    setHasFinished(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused || secondsLeft <= 0) {
      if (secondsLeft === 0 && !hasFinished) {
        setHasFinished(true);
        playTimerFinishBeep();
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasFinished(true);
          playTimerFinishBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, secondsLeft, hasFinished]);

  const addExtraTime = (extra: number) => {
    setSecondsLeft((prev) => prev + extra);
    setTotalSeconds((prev) => Math.max(prev, secondsLeft + extra));
    setHasFinished(false);
  };

  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100)) : 0;

  return (
    <div
      id="floating-rest-timer"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 transition-all duration-300"
    >
      <div className={`rounded-2xl border shadow-xl p-4 backdrop-blur-md transition-colors ${
        hasFinished
          ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
          : 'bg-zinc-900/95 text-zinc-100 border-zinc-700/80 shadow-black/40'
      }`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${hasFinished ? 'bg-white animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
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
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
                title={isPaused ? 'Continuar' : 'Pausar'}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
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
