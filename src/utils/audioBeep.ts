/**
 * Web Audio API & Notification engine for the rest timer.
 * Designed to work reliably even when phone screen is locked or tab is in background.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Primes the audio context during user interaction (e.g. tapping "complete set").
 * Unlocks audio playback for background operation on iOS and Android.
 */
export function primeAudioContext(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Tiny silent buffer to activate the audio output line
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore
  }
}

/**
 * Triggers an energetic 3-tone chime immediately: D5 -> G5 -> High C6.
 */
export function playTimerFinishBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, time: 0, dur: 0.14 },   // D5
      { freq: 783.99, time: 0.15, dur: 0.14 }, // G5
      { freq: 1046.5, time: 0.3, dur: 0.55 },  // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.45, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {
    // Ignore
  }
}

/**
 * Schedules a finish chime directly in the Web Audio hardware clock
 * at `secondsInFuture`. This allows the sound to play even if the screen is locked!
 * Returns a cancel function.
 */
export function scheduleTimerFinishBeep(secondsInFuture: number): () => void {
  const ctx = getAudioContext();
  if (!ctx || secondsInFuture <= 0) return () => {};

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime + secondsInFuture;
    const notes = [
      { freq: 587.33, time: 0, dur: 0.14 },
      { freq: 783.99, time: 0.15, dur: 0.14 },
      { freq: 1046.5, time: 0.3, dur: 0.55 },
    ];

    const activeOscillators: OscillatorNode[] = [];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + time);

      gain.gain.setValueAtTime(0.45, startTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + time);
      osc.stop(startTime + time + dur);

      activeOscillators.push(osc);
    });

    return () => {
      try {
        activeOscillators.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        });
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Vibrates the device using the Vibration API.
 */
export function triggerTimerVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Pattern: buzz 400ms, pause 150ms, buzz 400ms, pause 150ms, buzz 700ms
      navigator.vibrate([400, 150, 400, 150, 700]);
    } catch {
      // Ignore
    }
  }
}

/**
 * Requests notification permission quietly if not yet determined.
 */
export function requestNotificationPermission(): void {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Shows a native system notification with sound/vibration when the rest ends.
 */
export async function showTimerFinishNotification(
  exerciseName?: string,
  setNumber?: number
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = '¡Tiempo de descanso terminado! ⏱️';
  const body = exerciseName
    ? `${exerciseName}${setNumber ? ` • Serie ${setNumber}` : ''}: ¡Es hora de la siguiente serie!`
    : '¡Descanso completado! Es hora de la siguiente serie.';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: 'favicon.png',
          badge: 'favicon.png',
          tag: 'rest-timer-finished',
          silent: false,
        } as NotificationOptions);
        return;
      }
    }

    new Notification(title, {
      body,
      icon: 'favicon.png',
      tag: 'rest-timer-finished',
    });
  } catch {
    // Ignore notification errors
  }
}

