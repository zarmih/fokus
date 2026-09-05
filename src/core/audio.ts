import { storage } from './storage';

let audioCtx: AudioContext | null = null;

export function playBeep(success: boolean) {
  if (!storage.getProfile().soundOn) return;
  
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = success ? 'sine' : 'sawtooth';
  osc.frequency.setValueAtTime(success ? 600 : 200, audioCtx.currentTime);
  if (success) {
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
  }

  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
