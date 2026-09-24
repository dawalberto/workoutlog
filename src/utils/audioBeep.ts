/**
 * Audio and haptic feedback utilities for the rest timer.
 * Configured with 'ambient' audio mode so it NEVER interrupts or pauses
 * background music, podcasts, or Spotify.
 *
 * No silent audio loops, no push notifications, no audio focus theft.
 */

let sharedAudioContext: AudioContext | null = null;
let lastBeepTime = 0;

function configureAmbientSession(): void {
  if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
    try {
      // 'ambient' mixes app audio with background music/podcasts without pausing them
      (navigator as any).audioSession.type = 'ambient';
    } catch {
      // Ignore unsupported browsers
    }
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
    configureAmbientSession();
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Initializes the AudioContext on user interaction if needed,
 * purely ensuring the ambient context is ready without playing any sound
 * or acquiring exclusive audio focus.
 */
export function initRestAudioContext(): void {
  configureAmbientSession();
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays an upbeat 3-tone chime (D5 -> G5 -> C6) when the rest timer ends.
 * Only called when the user is actively inside the app.
 * Uses ambient mixing to ensure external music is never stopped.
 */
export function playTimerFinishBeep(): void {
  const now = Date.now();
  if (now - lastBeepTime < 2000) return;
  lastBeepTime = now;

  configureAmbientSession();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const audioNow = ctx.currentTime;
    const notes = [
      { freq: 587.33, time: 0, dur: 0.14 },    // D5
      { freq: 783.99, time: 0.15, dur: 0.14 },  // G5
      { freq: 1046.5, time: 0.3, dur: 0.55 },   // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioNow + time);

      gain.gain.setValueAtTime(0.4, audioNow + time);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(audioNow + time);
      osc.stop(audioNow + time + dur);
    });
  } catch {
    // Ignore audio playback errors
  }
}

/**
 * Vibrates the device using the native Vibration API.
 */
export function triggerTimerVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Short friendly buzz pattern
      navigator.vibrate([300, 100, 300]);
    } catch {
      // Ignore
    }
  }
}
