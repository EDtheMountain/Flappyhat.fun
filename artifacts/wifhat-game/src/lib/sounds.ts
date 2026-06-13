let audioCtx: AudioContext | null = null;
function ctx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
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

export function playCoin() {
  osc("sine", 880, 1200, 0.06, 0.22, 0);
  osc("sine", 1100, 900, 0.12, 0.22, 0.06);
}

export function playScore() {
  osc("square", 440, 660, 0.06, 0.08);
}

export function playGameOver() {
  const c = ctx();
  // Noise burst with bandpass
  const bufSize = Math.floor(c.sampleRate * 0.35);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(900, c.currentTime);
  bp.frequency.linearRampToValueAtTime(80, c.currentTime + 0.35);
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.45, c.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  src.connect(bp); bp.connect(g1); g1.connect(c.destination);
  src.start(); src.stop(c.currentTime + 0.35);
  // Sawtooth tail
  osc("sawtooth", 160, 60, 0.4, 0.45);
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
