let audioCtx: AudioContext | null = null;
let unlocked = false;

function ctx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Call this inside a user-gesture handler (tap/click) to unlock audio on mobile/iOS. */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const c = ctx();
  // Play a silent buffer — required by iOS Safari to fully activate the AudioContext
  const buf = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
  c.resume();
}

function osc(type: OscillatorType, f1: number, f2: number, dur: number, vol: number, t = 0) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(f1, c.currentTime + t);
  o.frequency.linearRampToValueAtTime(f2, c.currentTime + t + dur);
  g.gain.setValueAtTime(vol, c.currentTime + t);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + dur);
  o.start(c.currentTime + t);
  o.stop(c.currentTime + t + dur);
}

export function playFlap() {
  osc("sine", 320, 560, 0.08, 0.18);
}

export function playScore() {
  osc("square", 440, 660, 0.06, 0.08);
}

export function playGameOver() {
  // Sad trombone: wah wah wah WOOOOMP
  osc("sawtooth", 450, 430, 0.20, 0.32, 0.00);
  osc("sawtooth", 400, 382, 0.20, 0.32, 0.25);
  osc("sawtooth", 356, 338, 0.20, 0.32, 0.50);
  osc("sawtooth", 300, 130, 0.80, 0.38, 0.76);
  // Little "bonk" at the very end for extra comedy
  osc("square", 110, 55, 0.14, 0.20, 1.55);
}

export function playStart() {
  [440, 550, 660, 880].forEach((f, i) => osc("sine", f, f, 0.1, 0.12, i * 0.07));
}

export function playCountdown(n: 1 | 2 | 3) {
  const freqs: Record<number, number> = { 3: 220, 2: 330, 1: 440 };
  osc("square", freqs[n], freqs[n], 0.12, 0.15);
}

export function playGo() {
  osc("sine", 880, 1200, 0.1, 0.2, 0);
  osc("sine", 1200, 880, 0.15, 0.2, 0.1);
}
