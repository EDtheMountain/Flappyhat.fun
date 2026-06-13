let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  gainValue = 0.15,
  startTime = 0,
  freqEnd?: number
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + startTime + duration);
  }

  gain.gain.setValueAtTime(gainValue, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
}

export function playFlap() {
  playTone(300, 0.08, "square", 0.12, 0, 500);
}

export function playCoin() {
  playTone(660, 0.1, "sine", 0.18, 0);
  playTone(880, 0.12, "sine", 0.18, 0.08);
  playTone(1100, 0.15, "sine", 0.18, 0.18);
}

export function playGameOver() {
  playTone(400, 0.15, "square", 0.2, 0);
  playTone(300, 0.15, "square", 0.2, 0.18);
  playTone(200, 0.15, "square", 0.2, 0.36);
  playTone(150, 0.4,  "square", 0.2, 0.54);
}

export function playScore() {
  playTone(523, 0.06, "sine", 0.1, 0);
  playTone(659, 0.08, "sine", 0.1, 0.06);
}
