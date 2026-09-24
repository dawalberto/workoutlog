/**
 * Web Audio API & Notification engine for the rest timer.
 * Designed to work reliably even when phone screen is locked or tab is in background.
 */

let sharedAudioContext: AudioContext | null = null;
let lastBeepTime = 0;
let lastNotificationTime = 0;

let silentAudioSource: AudioBufferSourceNode | null = null;
let silentGain: GainNode | null = null;
let wakeLockSentinel: any = null;

/**
 * Requests the Screen Wake Lock API to prevent the device screen from turning off
 * while a rest timer is counting down.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Releases the screen wake lock when timer finishes or closes.
 */
export function releaseScreenWakeLock(): void {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

function stopSilentAudio(): void {
  try {
    if (silentAudioSource) {
      silentAudioSource.stop();
      silentAudioSource.disconnect();
      silentAudioSource = null;
    }
    if (silentGain) {
      silentGain.disconnect();
      silentGain = null;
    }
  } catch {
    // Ignore
  }
}

/**
 * Starts a silent Web Audio buffer loop.
 * Unlike HTML5 <audio> or navigator.mediaSession:
 * 1. Web Audio API does NOT take exclusive audio focus, so Spotify, Apple Music, and Podcasts are NEVER paused!
 * 2. Web Audio API does NOT create a lock screen music player widget!
 * 3. It keeps the browser's audio rendering clock running.
 */
export function startRestAudioSession(_exerciseName?: string, _setNumber?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Set iOS 16.4+ audioSession to playback for background execution without pausing other apps
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as any).audioSession.type = 'playback';
      } catch {}
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Explicitly clear any existing MediaSession metadata so mobile OS never displays a playback widget
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }

    // Stop previous silent loop if any
    stopSilentAudio();

    // Create 1-second silent AudioBuffer and loop it
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    silentAudioSource = ctx.createBufferSource();
    silentAudioSource.buffer = buffer;
    silentAudioSource.loop = true;

    silentGain = ctx.createGain();
    silentGain.gain.value = 0.00001; // Inaudible, maintains active audio pipeline without stealing focus

    silentAudioSource.connect(silentGain);
    silentGain.connect(ctx.destination);

    silentAudioSource.start(0);
  } catch {
    // Ignore audio initialization errors
  }
}

/**
 * Pauses background audio session when the user pauses the rest timer.
 */
export function pauseRestAudioSession(): void {
  stopSilentAudio();
  releaseScreenWakeLock();
}

/**
 * Completely stops the background audio session when the rest timer finishes or is dismissed.
 */
export function stopRestAudioSession(): void {
  stopSilentAudio();
  releaseScreenWakeLock();

  // Clear any MediaSession state
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch {}
  }
}

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
  const now = Date.now();
  if (now - lastBeepTime < 2000) return;
  lastBeepTime = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const audioNow = ctx.currentTime;
    const notes = [
      { freq: 587.33, time: 0, dur: 0.14 },   // D5
      { freq: 783.99, time: 0.15, dur: 0.14 }, // G5
      { freq: 1046.5, time: 0.3, dur: 0.55 },  // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioNow + time);

      gain.gain.setValueAtTime(0.45, audioNow + time);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(audioNow + time);
      osc.stop(audioNow + time + dur);
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
export function scheduleTimerFinishBeep(
  secondsInFuture: number,
  onAudioFinish?: () => void
): () => void {
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

    notes.forEach(({ freq, time, dur }, index) => {
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

      if (index === notes.length - 1 && onAudioFinish) {
        osc.onended = () => {
          onAudioFinish();
        };
      }

      activeOscillators.push(osc);
    });

    return () => {
      try {
        activeOscillators.forEach((osc) => {
          try {
            osc.onended = null;
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
 * Enforces a 3.5s debounce to guarantee notifications can never fire twice.
 */
export async function showTimerFinishNotification(
  exerciseName?: string,
  setNumber?: number
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  if (now - lastNotificationTime < 3500) {
    return;
  }
  lastNotificationTime = now;

  const title = '¡Tiempo de descanso terminado! ⏱️';
  const body = exerciseName
    ? `${exerciseName}${setNumber ? ` • Serie ${setNumber}` : ''}: ¡Es hora de la siguiente serie!`
    : '¡Descanso completado! Es hora de la siguiente serie.';

  let iconUrl = 'favicon.png';
  try {
    iconUrl = new URL('pwa-192x192.png', window.location.href).href;
  } catch {
    iconUrl = 'favicon.png';
  }

  const notificationOptions = {
    body,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'workoutlog-rest-timer',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [400, 150, 400, 150, 700],
  };

  try {
    if ('serviceWorker' in navigator) {
      // Race getRegistration with a 600ms timeout to prevent hanging if SW is transitioning
      const regPromise = navigator.serviceWorker.getRegistration();
      const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 600));
      const reg = await Promise.race([regPromise, timeoutPromise]);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions as NotificationOptions);
        return;
      }
    }
  } catch (err) {
    console.warn('Service worker notification error, falling back to Notification:', err);
  }

  try {
    new Notification(title, {
      body,
      icon: iconUrl,
      tag: 'workoutlog-rest-timer',
    });
  } catch {
    // Ignore notification errors
  }
}

/**
 * Schedules a future notification using the native Notification Triggers API (if supported).
 * In modern Chromium/Android browsers, this lets the OS AlarmManager fire the notification
 * at the exact timestamp even if the device is locked in Deep Sleep/Doze mode!
 */
export async function scheduleRestTimerNotification(
  targetTimestampMs: number,
  exerciseName?: string,
  setNumber?: number
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = '¡Tiempo de descanso terminado! ⏱️';
  const body = exerciseName
    ? `${exerciseName}${setNumber ? ` • Serie ${setNumber}` : ''}: ¡Es hora de la siguiente serie!`
    : '¡Descanso completado! Es hora de la siguiente serie.';

  let iconUrl = 'favicon.png';
  try {
    iconUrl = new URL('pwa-192x192.png', window.location.href).href;
  } catch {
    iconUrl = 'favicon.png';
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        const TimestampTriggerClass = (window as unknown as { TimestampTrigger?: new (time: number) => unknown })
          .TimestampTrigger;
        if (TimestampTriggerClass) {
          await reg.showNotification(title, {
            body,
            icon: iconUrl,
            badge: iconUrl,
            tag: 'workoutlog-rest-timer',
            renotify: true,
            silent: false,
            vibrate: [400, 150, 400, 150, 700],
            showTrigger: new TimestampTriggerClass(targetTimestampMs),
          } as NotificationOptions);
        }
      }
    }
  } catch (err) {
    console.warn('Could not schedule notification trigger:', err);
  }
}

/**
 * Cancels any pending scheduled notification if the timer is reset, paused, or dismissed.
 */
export async function cancelScheduledNotification(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.getNotifications) {
        const notifications = await reg.getNotifications({
          tag: 'workoutlog-rest-timer',
        });
        notifications.forEach((n) => n.close());
      }
    }
  } catch {
    // Ignore
  }
}


