/**
 * Audio and haptic feedback utilities for the rest timer.
 * Configured with 'ambient' audio mode so it NEVER interrupts or pauses
 * background music, podcasts, or Spotify.
 *
 * Keeps the audio hardware awake during countdowns > 15s to prevent
 * mobile browsers from putting the AudioContext into power-saving suspension.
 */

let sharedAudioContext: AudioContext | null = null;
let lastBeepTime = 0;
let keepAliveTimer: any = null;
let cachedWavAudio: HTMLAudioElement | null = null;

function configureAmbientSession(): void {
  if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
    try {
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
 * Initializes the AudioContext on user interaction (e.g. set check, timer start),
 * ensuring the ambient context is ready and running.
 */
export function initRestAudioContext(): void {
  configureAmbientSession();
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  // Also prime backup audio element
  try {
    if (!cachedWavAudio) {
      cachedWavAudio = createChimeAudioElement();
    }
  } catch {}
}

/**
 * Keeps the Web Audio pipeline alive during timers longer than 15 seconds.
 * Mobile operating systems (iOS & Android) put Web Audio contexts to sleep after ~10-15s
 * of silence, making subsequent timer end beeps fail.
 * This runs a periodic inaudible micro-tick (amplitude 0) to ensure the audio hardware stays awake.
 */
export function startRestAudioKeepAlive(): void {
  initRestAudioContext();
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }

  keepAliveTimer = setInterval(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      } else if (ctx.state === 'running') {
        // Play an imperceptible 1-sample silent buffer to keep the hardware clock ticking
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {
      // Ignore keep-alive errors
    }
  }, 4500);
}

/**
 * Stops the audio keep-alive once the timer completes or is dismissed.
 */
export function stopRestAudioKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * Generates an in-memory WAV chime as an HTMLAudioElement fallback
 */
function createChimeAudioElement(): HTMLAudioElement | null {
  try {
    // Generate a short 0.6s PCM WAV file with an upbeat 3-tone chime (E5 -> A5 -> E6)
    const sampleRate = 22050;
    const duration = 0.6;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Chime notes: E5 (659Hz) 0-0.15s, A5 (880Hz) 0.15-0.3s, E6 (1318Hz) 0.3-0.6s
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let freq = 0;
      let amp = 0;

      if (t < 0.15) {
        freq = 659.25;
        amp = Math.sin((t / 0.15) * Math.PI) * 0.4;
      } else if (t < 0.3) {
        const localT = t - 0.15;
        freq = 880.0;
        amp = Math.sin((localT / 0.15) * Math.PI) * 0.45;
      } else {
        const localT = t - 0.3;
        freq = 1318.51;
        amp = Math.exp(-localT * 7) * 0.5;
      }

      const sample = Math.sin(2 * Math.PI * freq * t) * amp;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 0.8;
    return audio;
  } catch {
    return null;
  }
}

/**
 * Plays an upbeat 3-tone chime (E5 -> A5 -> E6) when the rest timer ends.
 * Uses ambient mixing to ensure external music is never stopped.
 * Works even after long pauses (>15s) thanks to active keep-alive and dual-playback fallback.
 */
export function playTimerFinishBeep(): void {
  const now = Date.now();
  if (now - lastBeepTime < 1200) return;
  lastBeepTime = now;

  configureAmbientSession();
  const ctx = getAudioContext();

  let webAudioStarted = false;

  if (ctx) {
    try {
      const playNotes = () => {
        try {
          const audioNow = ctx.currentTime;
          const notes = [
            { freq: 659.25, time: 0, dur: 0.14 },     // E5
            { freq: 880.00, time: 0.15, dur: 0.14 },  // A5
            { freq: 1318.51, time: 0.31, dur: 0.45 }, // E6
          ];

          notes.forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioNow + time);

            gain.gain.setValueAtTime(0.01, audioNow + time);
            gain.gain.exponentialRampToValueAtTime(0.6, audioNow + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, audioNow + time + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(audioNow + time);
            osc.stop(audioNow + time + dur);
          });
          webAudioStarted = true;
        } catch {
          // ignore synthesizer error
        }
      };

      if (ctx.state === 'running') {
        playNotes();
      } else {
        ctx.resume()
          .then(() => playNotes())
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // Backup HTML5 Audio playback (especially if WebAudio was suspended or blocked)
  try {
    if (!cachedWavAudio) {
      cachedWavAudio = createChimeAudioElement();
    }
    if (cachedWavAudio) {
      cachedWavAudio.currentTime = 0;
      cachedWavAudio.play().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Vibrates the device using the native Vibration API with multi-pulse
 * and resilient fallback.
 */
export function triggerTimerVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // 3 short crisp pulses: 250ms buzz, 100ms pause, 250ms buzz, 100ms pause, 400ms buzz
      const success = navigator.vibrate([250, 100, 250, 100, 400]);
      if (!success) {
        navigator.vibrate(400);
      }
    } catch {
      try {
        navigator.vibrate(400);
      } catch {
        // Ignore unsupported
      }
    }
  }
}

