import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, X, Plus, Bell, RotateCcw, GripVertical } from 'lucide-react';
import Draggable, {
  type DraggableBounds,
  type DraggableData,
  type DraggableEvent,
  type DraggableEventHandler,
} from 'react-draggable';
import { formatStopwatch } from '../utils/timeCalculations';
import { 
  playTimerFinishBeep, 
  triggerTimerVibration,
  startRestAudioKeepAlive,
  stopRestAudioKeepAlive 
} from '../utils/audioBeep';
import { useRestTimerBar } from '../hooks/shell/useRestTimerBar';
import { getRestTimerRemainingMs } from '../utils/restTimer';
import { shouldPlayLocalRestAlert } from '../utils/restPush';
import { RestPushPrompt } from './RestPushPrompt';

const REST_TIMER_DRAG_HANDLE = '.rest-timer-drag-handle';
const REST_TIMER_DRAG_CANCEL = 'button, a, input, textarea, select';
const DRAG_VIEWPORT_MARGIN = 8;

type RestTimerDragPosition = {
  x: number;
  y: number;
};

function readDragViewport() {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

function restTimerDragBounds(
  node: HTMLElement,
  position: RestTimerDragPosition,
): DraggableBounds {
  const rect = node.getBoundingClientRect();
  const viewport = readDragViewport();
  const minX = viewport.left + DRAG_VIEWPORT_MARGIN;
  const minY = viewport.top + DRAG_VIEWPORT_MARGIN;
  const maxX = viewport.left + viewport.width - DRAG_VIEWPORT_MARGIN;
  const maxY = viewport.top + viewport.height - DRAG_VIEWPORT_MARGIN;

  return {
    left: position.x + minX - rect.left,
    top: position.y + minY - rect.top,
    right: position.x + maxX - rect.right,
    bottom: position.y + maxY - rect.bottom,
  };
}

function clampDragPosition(
  bounds: DraggableBounds | undefined,
  x: number,
  y: number,
): RestTimerDragPosition {
  if (
    bounds?.left == null ||
    bounds.right == null ||
    bounds.top == null ||
    bounds.bottom == null
  ) {
    return { x, y };
  }

  return {
    x: Math.min(bounds.right, Math.max(bounds.left, x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, y)),
  };
}

type RestTimerBarContentProps = {
  timer: NonNullable<ReturnType<typeof useRestTimerBar>>;
};

export const RestTimerBar: React.FC = () => {
  const timer = useRestTimerBar();
  if (!timer) return null;
  return <RestTimerBarContent timer={timer} />;
};

const RestTimerBarContent: React.FC<RestTimerBarContentProps> = ({ timer }) => {
  const {
    activeRestTimer,
    isInsideActiveRoutine,
    onReturnToRoutine,
    onClose,
    onPause,
    onResume,
    onExtend,
    restPushScheduleId,
    lastDeliveredScheduleId,
    lastDeliveredWhileVisible,
  } = timer;
  const { initialSeconds, targetEndTime, pausedRemainingMs, exerciseName, setNumber } = activeRestTimer;
  const isPaused = pausedRemainingMs !== undefined;
  const initialRemainingSec = Math.max(
    0,
    Math.ceil(getRestTimerRemainingMs(activeRestTimer, Date.now()) / 1000),
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(initialRemainingSec);
  const [totalSeconds, setTotalSeconds] = useState<number>(Math.max(initialSeconds, initialRemainingSec));
  const [hasFinished, setHasFinished] = useState<boolean>(initialRemainingSec <= 0);
  const [dragPosition, setDragPosition] = useState<RestTimerDragPosition>({ x: 0, y: 0 });
  const [dragBounds, setDragBounds] = useState<DraggableBounds | undefined>(undefined);

  // Synchronous ref to prevent double-firing sound/vibration
  const hasFinishedRef = useRef<boolean>(initialRemainingSec <= 0);
  const hasPlayedFinishAlertRef = useRef(false);
  const pendingHiddenAlertRef = useRef(initialRemainingSec <= 0);

  const workerRef = useRef<Worker | null>(null);
  const dragNodeRef = useRef<HTMLDivElement>(null);
  const dragBoundsRef = useRef<DraggableBounds | undefined>(undefined);

  const handleDragStart: DraggableEventHandler = () => {
    const node = dragNodeRef.current;
    if (!node) return;
    const nextBounds = restTimerDragBounds(node, dragPosition);
    dragBoundsRef.current = nextBounds;
    setDragBounds(nextBounds);
  };

  const handleDrag = (_event: DraggableEvent, data: DraggableData) => {
    setDragPosition(clampDragPosition(dragBoundsRef.current, data.x, data.y));
  };

  const dragHandle = (
    <div
      aria-label="Mover temporizador"
      title="Mover temporizador"
      className="rest-timer-drag-handle min-h-[48px] min-w-[48px] inline-flex items-center justify-center rounded-xl text-current opacity-70 cursor-grab active:cursor-grabbing touch-none"
    >
      <GripVertical className="w-5 h-5" aria-hidden="true" />
    </div>
  );

  // Centering lives on the outer anchor. react-draggable overwrites transform on its child.
  const renderDraggableBanner = (
    bannerId: string,
    anchorClassName: string,
    bannerClassName: string,
    children: React.ReactNode,
  ) => (
    <div className={anchorClassName}>
      <Draggable
        nodeRef={dragNodeRef}
        position={dragPosition}
        bounds={dragBounds}
        handle={REST_TIMER_DRAG_HANDLE}
        cancel={REST_TIMER_DRAG_CANCEL}
        onStart={handleDragStart}
        onDrag={handleDrag}
        onStop={handleDrag}
      >
        <div
          ref={dragNodeRef}
          id={bannerId}
          className={bannerClassName}
        >
          {children}
        </div>
      </Draggable>
    </div>
  );

  const playFinishAlert = useCallback(() => {
    if (hasPlayedFinishAlertRef.current) return;
    hasPlayedFinishAlertRef.current = true;
    pendingHiddenAlertRef.current = false;
    playTimerFinishBeep();
    triggerTimerVibration();
  }, []);

  const handleFinish = useCallback((shouldPlaySound: boolean = true) => {
    // Strictly execute only once per timer run
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setHasFinished(true);
    setSecondsLeft(0);
    stopRestAudioKeepAlive();
    pendingHiddenAlertRef.current = !shouldPlaySound;

    // Audio and haptic vibration feedback
    if (shouldPlaySound) {
      playFinishAlert();
    }
  }, [playFinishAlert]);

  // Update check based on real wall-clock time
  const checkTick = useCallback(() => {
    if (isPaused || hasFinishedRef.current) return;
    const now = Date.now();
    const remainingMs = getRestTimerRemainingMs(activeRestTimer, now);
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    setSecondsLeft(remainingSec);

    if (remainingMs <= 0) {
      const shouldPlayInForeground = document.visibilityState !== 'hidden' &&
        shouldPlayLocalRestAlert(
          restPushScheduleId,
          lastDeliveredScheduleId,
          lastDeliveredWhileVisible,
        );
      handleFinish(shouldPlayInForeground);
    }
  }, [
    activeRestTimer,
    isPaused,
    handleFinish,
    lastDeliveredScheduleId,
    lastDeliveredWhileVisible,
    restPushScheduleId,
  ]);

  // Reset when initialSeconds, targetEndTime, or exercise/set changes
  useEffect(() => {
    const now = Date.now();
    const remainingMs = getRestTimerRemainingMs(activeRestTimer, now);
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

    setSecondsLeft(remainingSec);
    setTotalSeconds((prev) => Math.max(prev, initialSeconds, remainingSec));

    if (remainingSec <= 0) {
      hasFinishedRef.current = true;
      setHasFinished(true);
    } else {
      hasFinishedRef.current = false;
      hasPlayedFinishAlertRef.current = false;
      pendingHiddenAlertRef.current = false;
      setHasFinished(false);
    }
  }, [activeRestTimer, initialSeconds, targetEndTime, pausedRemainingMs, exerciseName, setNumber]);

  // Setup ticking Web Worker + fallback interval + Page Visibility / Focus listeners
  useEffect(() => {
    if (isPaused || hasFinished) {
      stopRestAudioKeepAlive();
      return;
    }

    startRestAudioKeepAlive();

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
      stopRestAudioKeepAlive();
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

  useEffect(() => {
    if (!hasFinished || !pendingHiddenAlertRef.current || hasPlayedFinishAlertRef.current) return;

    const shouldPlayFallback = () => shouldPlayLocalRestAlert(
      restPushScheduleId,
      lastDeliveredScheduleId,
      lastDeliveredWhileVisible,
    );
    if (!shouldPlayFallback()) {
      pendingHiddenAlertRef.current = false;
      return;
    }
    if (document.visibilityState === 'visible') {
      playFinishAlert();
      return;
    }

    const timeout = window.setTimeout(() => {
      if (shouldPlayFallback()) playFinishAlert();
      else pendingHiddenAlertRef.current = false;
    }, 4_000);
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timeout);
      if (shouldPlayFallback()) playFinishAlert();
      else pendingHiddenAlertRef.current = false;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    hasFinished,
    lastDeliveredScheduleId,
    lastDeliveredWhileVisible,
    playFinishAlert,
    restPushScheduleId,
  ]);

  const togglePause = () => {
    if (isPaused) onResume();
    else onPause();
  };

  const addExtraTime = (extra: number) => {
    if (hasFinished) {
      setSecondsLeft(extra);
      setTotalSeconds(extra);
      hasFinishedRef.current = false;
      setHasFinished(false);
    }
    onExtend(extra);
  };

  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
      : 0;

  // Mini reduced pill banner when viewing outside active training (e.g. Diario, Historial, Catálogo)
  if (!isInsideActiveRoutine) {
    return renderDraggableBanner(
      'floating-mini-rest-timer',
      'fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]',
      'flex flex-col items-center gap-1.5 pointer-events-auto max-w-full touch-none select-none',
      <>
        <div
          className={`rounded-full border shadow-2xl px-3.5 sm:px-4 py-2 backdrop-blur-2xl flex items-center gap-2.5 sm:gap-3 transition-all duration-300 ${
            hasFinished
              ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_8px_30px_rgba(0,255,135,0.45)]'
              : 'bg-[#18181A]/95 text-white border-[#00FF87]/40 shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(0,255,135,0.2)]'
          }`}
        >
          {dragHandle}

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
              className={`min-h-[48px] px-3 py-1 text-xs font-black rounded-full transition-all flex items-center gap-1 active:scale-95 shrink-0 shadow-sm ${
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
            className={`min-h-[48px] min-w-[48px] p-1 rounded-full transition-colors active:scale-95 shrink-0 ${
              hasFinished ? 'text-black/70 hover:text-black hover:bg-black/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <RestPushPrompt />
      </>,
    );
  }

  // Full detailed banner when inside active routine
  return renderDraggableBanner(
    'floating-rest-timer',
    'fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-lg bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]',
    'w-full pointer-events-auto touch-none select-none',
    <>
      <div
        className={`rounded-2xl border shadow-2xl p-3.5 sm:p-5 backdrop-blur-2xl transition-all duration-300 overflow-hidden ${
          hasFinished
            ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_10px_40px_rgba(0,255,135,0.45)]'
            : 'bg-[#18181A]/95 text-white border-[#00FF87]/30 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(0,255,135,0.15)]'
        }`}
      >
        {/* Header line: Title, subtitle & close/return buttons */}
        <div className="flex items-center justify-between gap-2.5 mb-2">
          {dragHandle}
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
              className={`min-h-[48px] min-w-[48px] p-1.5 rounded-xl transition-colors active:scale-95 ${
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
              className={`min-h-[48px] px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0 ${
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
                className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all active:scale-95 flex items-center justify-center shrink-0"
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
              className={`min-h-[48px] px-4 sm:px-5 text-xs font-black rounded-xl transition-all active:scale-95 shrink-0 inline-flex items-center justify-center ${
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
        <div className="mt-2">
          <RestPushPrompt />
        </div>
      </div>
    </>,
  );
};
