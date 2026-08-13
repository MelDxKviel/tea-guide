let audioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    // Autoplay policies vary.
  }
}

export function playCompleteSound(): void {
  try {
    unlockAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(392, now + 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch {
    // Sound is optional.
  }
}

export function vibrateComplete(): void {
  try {
    navigator.vibrate?.([180, 70, 180]);
  } catch {
    // Vibration may be missing or denied.
  }
}

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if (!('wakeLock' in navigator)) return null;
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}
