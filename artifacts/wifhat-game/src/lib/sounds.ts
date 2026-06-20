let audioCtx: AudioContext | null = null;
let unlocked = false;
let silentEl: HTMLAudioElement | null = null;

/**
 * iPhones mute ALL Web Audio API output when the physical ring/silent switch is
 * on (iPads/desktops don't have that switch, which is why audio works there but
 * not on phones). Setting the audio session to "playback" tells iOS to treat our
 * sound like media playback, so it ignores the silent switch (iOS 16.4+).
 */
function setPlaybackSession() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    /* not supported — fall back to the silent-audio-element trick below */
  }
}

/**
 * Fallback for older iOS that lacks navigator.audioSession: keeping a looping
 * silent <audio> element playing puts the page into a "playing media" state,
 * which also routes Web Audio around the silent switch.
 */
function playSilentEl() {
  try {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.setAttribute("playsinline", "");
      silentEl.loop = true;
      // 0.05s of silence (base64 WAV)
      silentEl.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
      silentEl.volume = 0;
    }
    void silentEl.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext {
  if (!audioCtx) {
    setPlaybackSession();
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function doUnlock() {
  // Always (re)assert the playback session + resume — iOS can drop these when
  // the tab backgrounds or the context auto-suspends, so this isn't one-shot.
  setPlaybackSession();
  const c = getCtx();
  void c.resume();
  if (!unlocked) {
    unlocked = true;
    playSilentEl();
    // Play a zero-length silent buffer — the iOS trick to activate AudioContext
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  }
}

// Register native (non-React) listeners so iOS Safari counts them as real user gestures.
// These fire on the very first touch or click anywhere on the page.
function bootstrap() {
  const events = ["touchstart", "touchend", "mousedown", "keydown"] as const;
  function handler() {
    doUnlock();
    events.forEach((ev) => document.removeEventListener(ev, handler, true));
  }
  events.forEach((ev) => document.addEventListener(ev, handler, { capture: true, passive: true, once: false }));
}
bootstrap();

/** Also call this directly inside React button handlers for extra certainty. */
export function unlockAudio() {
  doUnlock();
}

function ctx() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
  return c;
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
