import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useSubmitScore } from "@workspace/api-client-react";
import wifhatSrc from "@assets/Wifhat_1781355793327.png";
import bgSrc from "@assets/Background_1_1781361780648.png";
import * as Sounds from "@/lib/sounds";

// ── Types ─────────────────────────────────────────────────────────────────────
type Pipe     = { x: number; gapTop: number; passed: boolean; hasCoin: boolean; coinCollected: boolean };
type FreeCoin = { x: number; y: number; collected: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; age: number };
type FloatText = { x: number; y: number; text: string; color: string; age: number; life: number };
type Cloud    = { x: number; y: number; r: number; speed: number };
type Phase    = "countdown" | "playing" | "gameover";

// ── Colors ────────────────────────────────────────────────────────────────────
const GOLD      = "#ffd700";
const GOLD_DARK = "#b89000";
const GOLD_LETTER = "#9a7800";
const GROUND_DARK  = "#3a6025";
const GROUND_LIGHT = "#4a7830";
const SKY  = "#55e2eb";
const FONT = '"Courier New", monospace';
const COUNTDOWN_COLORS: Record<string | number, string> = {
  3: "#ff4444", 2: "#ff9900", 1: "#ffdd00", "GO!": "#44ff88",
};

// ── Canvas dimensions ─────────────────────────────────────────────────────────
function makeDims(GW: number, GH: number) {
  const PIPE_W = GH * 0.10;
  const CAP_H  = PIPE_W * 0.55;
  const HAT_W  = GH * 0.115;
  return {
    GW, GH,
    GRAVITY:    GH * 0.00063,
    FLAP:      -(GH * 0.013),
    SCROLL:     GW / 140,
    PIPE_GAP:   GH * 0.275,
    PIPE_W, CAP_H,
    GROUND_H:   GH * 0.115,
    HAT_W,
    HAT_H:      HAT_W * 0.80,
    HAT_X:      GW * 0.22,
    MIN_TOP:    Math.max(CAP_H + 20, GH * 0.16),
    COIN_R:     PIPE_W * 0.24,
    SCORE_SIZE: Math.round(GH * 0.036),
    BTH_SIZE:   Math.round(GH * 0.028),
    LVL_SIZE:   Math.round(GH * 0.022),
    FLOAT_SIZE: Math.round(GH * 0.022),
  };
}
type Dims = ReturnType<typeof makeDims>;

// ── Realistic pipe drawing ────────────────────────────────────────────────────
function drawPipePair(
  ctx: CanvasRenderingContext2D,
  x: number, gapTop: number, gapBottom: number,
  pipeW: number, capH: number, floorY: number,
) {
  const capOver = pipeW * 0.14;
  const capW = pipeW + capOver * 2;
  const capX = x - capOver;

  function bodyGrad(lx: number, lw: number) {
    const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    g.addColorStop(0,    "#1c5224");
    g.addColorStop(0.10, "#3fa83e");
    g.addColorStop(0.28, "#6ed65e");
    g.addColorStop(0.55, "#3fa83e");
    g.addColorStop(0.85, "#276030");
    g.addColorStop(1,    "#1c5224");
    return g;
  }
  function capGrad(lx: number, lw: number) {
    const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    g.addColorStop(0,    "#184821");
    g.addColorStop(0.10, "#38a03a");
    g.addColorStop(0.28, "#72e86a");
    g.addColorStop(0.55, "#38a03a");
    g.addColorStop(1,    "#184821");
    return g;
  }

  // Top pipe body
  const topBodyH = gapTop - capH;
  if (topBodyH > 0) {
    ctx.fillStyle = bodyGrad(x, pipeW);
    ctx.fillRect(x, 0, pipeW, topBodyH);
    ctx.fillStyle = "rgba(255,255,255,0.11)";
    ctx.fillRect(x + pipeW * 0.17, 0, pipeW * 0.11, topBodyH);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x + pipeW * 0.85, 0, pipeW * 0.15, topBodyH);
  }
  // Top pipe cap
  if (gapTop > 0) {
    ctx.fillStyle = capGrad(capX, capW);
    ctx.fillRect(capX, gapTop - capH, capW, capH);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(capX + capW * 0.13, gapTop - capH, capW * 0.10, capH);
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(capX, gapTop - 4, capW, 4);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(capX, gapTop - capH, capW, 3);
  }
  // Bottom pipe cap
  const botH = floorY - gapBottom;
  if (botH > 0) {
    ctx.fillStyle = capGrad(capX, capW);
    ctx.fillRect(capX, gapBottom, capW, capH);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(capX + capW * 0.13, gapBottom, capW * 0.10, capH);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(capX, gapBottom, capW, 4);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(capX, gapBottom + capH - 3, capW, 3);
  }
  // Bottom pipe body
  const botBodyH = floorY - gapBottom - capH;
  if (botBodyH > 0) {
    ctx.fillStyle = bodyGrad(x, pipeW);
    ctx.fillRect(x, gapBottom + capH, pipeW, botBodyH);
    ctx.fillStyle = "rgba(255,255,255,0.11)";
    ctx.fillRect(x + pipeW * 0.17, gapBottom + capH, pipeW * 0.11, botBodyH);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x + pipeW * 0.85, gapBottom + capH, pipeW * 0.15, botBodyH);
  }
}

// ── Coin drawing (shared) ─────────────────────────────────────────────────────
function drawCoin(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  r: number, ts: number,
) {
  const pulse = 1 + Math.sin(ts * 0.008) * 0.07;
  const pr = r * pulse;
  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, pr * 1.8);
  glow.addColorStop(0, "rgba(255,215,0,0.55)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, pr * 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();
  ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = GOLD_LETTER;
  ctx.font = `bold ${Math.round(pr * 1.1)}px ${FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("B", cx, cy + 1);
}

// ── Cloud drawing ─────────────────────────────────────────────────────────────
function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(cx,             cy,             r,        0, Math.PI * 2);
  ctx.arc(cx + r * 0.95,  cy - r * 0.22, r * 0.72, 0, Math.PI * 2);
  ctx.arc(cx + r * 1.85,  cy + r * 0.05, r * 0.62, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.72,  cy + r * 0.08, r * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.beginPath();
  ctx.arc(cx + r * 0.12, cy - r * 0.28, r * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Level helpers ─────────────────────────────────────────────────────────────
function levelT(lv: number)                      { return (Math.min(100, lv) - 1) / 99; }
function levelScroll(base: number, lv: number)   { return base * (1 + levelT(lv) * 1.1); }
function levelGap(base: number, lv: number)      { return base * (1 - levelT(lv) * 0.48); }
function levelInterval(lv: number)               { return Math.max(1150, 1900 - levelT(lv) * 750); }

/** Number of pipes in the next cluster, based on current level */
function clusterCount(lv: number): number {
  const r = Math.random();
  if (lv >= 75) return r < 0.20 ? 2 : r < 0.55 ? 3 : 4;
  if (lv >= 50) return r < 0.30 ? 2 : r < 0.75 ? 3 : 4;
  if (lv >= 25) return r < 0.50 ? 1 : r < 0.85 ? 2 : 3;
  if (lv >= 10) return r < 0.60 ? 1 : 2;
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Game() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
  const submitScore = useSubmitScore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hatImg    = useRef<HTMLImageElement | null>(null);
  const bgImg     = useRef<HTMLImageElement | null>(null);
  const D         = useRef<Dims>(makeDims(400, 600));

  // ── UI state ──────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState<number | string>(3);
  const [score, setScore]         = useState(0);
  const [level, setLevel]         = useState(1);
  const [bthEarned, setBthEarned] = useState(0);
  const [finalResult, setFinalResult] = useState<{ isHighScore: boolean; rank?: number | null } | null>(null);

  // ── Game refs ─────────────────────────────────────────────────────────────
  const phaseRef       = useRef<Phase>("countdown");
  const hatY           = useRef(0);
  const hatVY          = useRef(0);
  const pipes          = useRef<Pipe[]>([]);
  const freeCoins      = useRef<FreeCoin[]>([]);
  const particles      = useRef<Particle[]>([]);
  const floatTexts     = useRef<FloatText[]>([]);
  const clouds         = useRef<Cloud[]>([]);
  const scoreRef       = useRef(0);
  const bthRef         = useRef(0);
  const levelRef       = useRef(1);
  const pipesPassedRef = useRef(0);
  const shakeRef       = useRef(0);
  const bgOffset       = useRef(0);
  const lastPipeTs     = useRef(0);
  const lastFreeCoinTs = useRef(0);
  const frameId        = useRef(0);
  const loopRef        = useRef<FrameRequestCallback>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Load images ───────────────────────────────────────────────────────────
  useEffect(() => {
    ([
      [wifhatSrc, hatImg],
      [bgSrc,     bgImg],
    ] as [string, React.MutableRefObject<HTMLImageElement | null>][]).forEach(([src, ref]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { ref.current = img; };
    });
  }, []);

  // ── Init canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    const GW = window.innerWidth;
    const GH = window.innerHeight;
    D.current = makeDims(GW, GH);
    hatY.current = GH * 0.4;
    if (canvasRef.current) {
      canvasRef.current.width  = GW;
      canvasRef.current.height = GH;
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initClouds = () => {
    const d = D.current;
    clouds.current = [
      { x: d.GW * 0.08, y: d.GH * 0.07, r: d.GH * 0.042, speed: 0.14 },
      { x: d.GW * 0.30, y: d.GH * 0.14, r: d.GH * 0.030, speed: 0.22 },
      { x: d.GW * 0.55, y: d.GH * 0.05, r: d.GH * 0.052, speed: 0.12 },
      { x: d.GW * 0.78, y: d.GH * 0.18, r: d.GH * 0.035, speed: 0.19 },
      { x: d.GW * 1.05, y: d.GH * 0.10, r: d.GH * 0.044, speed: 0.16 },
    ];
  };

  /**
   * Spawn a cluster of 1-4 pipe pairs at the right edge.
   * All pipes in a cluster share the same gap height; tight spacing creates a wall.
   */
  const addPipeCluster = () => {
    const d = D.current;
    const gap    = levelGap(d.PIPE_GAP, levelRef.current);
    const maxTop = d.GH - d.GROUND_H - gap - d.MIN_TOP;
    const gapTop = d.MIN_TOP + Math.random() * Math.max(0, maxTop - d.MIN_TOP);
    const count  = clusterCount(levelRef.current);
    // Spacing: pipe body + narrow corridor (≈ 1.8 × pipe width)
    const spacing = d.PIPE_W * 1.85;

    for (let i = 0; i < count; i++) {
      // Slight height jitter on each pipe in a multi-pipe cluster
      const jitter = count > 1 ? (Math.random() - 0.5) * 30 : 0;
      const clampedTop = Math.max(d.MIN_TOP, Math.min(maxTop + d.MIN_TOP, gapTop + jitter));
      // Only the last pipe in the cluster carries a coin (reward for clearing the wall)
      const hasCoin = i === count - 1 && Math.random() > 0.35;
      pipes.current.push({
        x: d.GW + d.PIPE_W + i * spacing,
        gapTop: clampedTop,
        passed: false,
        hasCoin,
        coinCollected: false,
      });
    }
  };

  /** Spawn a free-floating $BTH coin anywhere in the open sky */
  const spawnFreeCoin = () => {
    const d = D.current;
    const floorY = d.GH - d.GROUND_H;
    const margin = d.COIN_R * 3;
    const minY = d.GH * 0.10 + margin;
    const maxY = floorY - margin;
    freeCoins.current.push({
      x: d.GW + d.COIN_R * 2,
      y: minY + Math.random() * (maxY - minY),
      collected: false,
    });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, upward = false) => {
    for (let i = 0; i < count; i++) {
      const angle = upward
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
        : Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      particles.current.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, color, size: 3 + Math.random() * 4, life: 38, age: 0 });
    }
  };

  const spawnFloat = (x: number, y: number, text: string, color: string) => {
    floatTexts.current.push({ x, y, text, color, age: 0, life: 84 });
  };

  const flap = () => {
    if (phaseRef.current !== "playing") return;
    const d = D.current;
    hatVY.current = d.FLAP;
    spawnParticles(d.HAT_X + d.HAT_W * 0.5, hatY.current + d.HAT_H, "#ffccdd", 5, true);
    Sounds.playFlap();
  };

  const triggerGameOver = () => {
    cancelAnimationFrame(frameId.current);
    setPhase("gameover");
    Sounds.playGameOver();
    if (user) {
      submitScore.mutate({ data: { score: scoreRef.current } }, {
        onSuccess: (d) => setFinalResult({ isHighScore: d.isHighScore, rank: d.rank }),
      });
    }
  };

  const startGame = () => {
    hatY.current = D.current.GH * 0.4;
    hatVY.current = 0;
    pipes.current = [];
    freeCoins.current = [];
    particles.current = [];
    floatTexts.current = [];
    scoreRef.current = 0;
    bthRef.current = 0;
    levelRef.current = 1;
    pipesPassedRef.current = 0;
    shakeRef.current = 0;
    bgOffset.current = 0;
    lastPipeTs.current = 0;
    lastFreeCoinTs.current = 0;
    setScore(0); setBthEarned(0); setLevel(1); setFinalResult(null);
    initClouds();
    setPhase("playing");
    Sounds.playStart();
    addPipeCluster();
    frameId.current = requestAnimationFrame(loopRef.current);
  };

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    let count = 3;
    setCountdown(count);
    Sounds.playCountdown(count as 1 | 2 | 3);
    const timer = setInterval(() => {
      count--;
      if (count > 0) { setCountdown(count); Sounds.playCountdown(count as 1 | 2 | 3); }
      else if (count === 0) { setCountdown("GO!"); Sounds.playGo(); }
      else { clearInterval(timer); startGame(); }
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Game loop ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loopRef.current = (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const d = D.current;
      const { GW, GH, GRAVITY, SCROLL, PIPE_GAP, PIPE_W, CAP_H, GROUND_H, HAT_W, HAT_H, HAT_X, COIN_R } = d;
      const floorY = GH - GROUND_H;

      const lv           = levelRef.current;
      const curScroll    = levelScroll(SCROLL, lv);
      const curGap       = levelGap(PIPE_GAP, lv);
      const curInterval  = levelInterval(lv);
      // Free coins spawn more frequently at higher levels (extra reward)
      const coinInterval = Math.max(1800, 3500 - levelT(lv) * 1700);

      ctx.imageSmoothingEnabled = false;
      ctx.save();

      // Screen shake
      if (shakeRef.current > 0.5) {
        ctx.translate((Math.random() * 2 - 1) * shakeRef.current, (Math.random() * 2 - 1) * shakeRef.current);
        shakeRef.current *= 0.78;
      }

      // ── Background ─────────────────────────────────────────────────────
      bgOffset.current += curScroll * 0.45;
      if (bgImg.current && bgImg.current.naturalWidth > 0) {
        const iw = bgImg.current.naturalWidth;
        const ih = bgImg.current.naturalHeight;
        const scale = GH / ih;
        const sw = iw * scale;
        const off = bgOffset.current % sw;
        for (let x = -off; x < GW + sw; x += sw) ctx.drawImage(bgImg.current, x, 0, sw, GH);
      } else {
        ctx.fillStyle = SKY;
        ctx.fillRect(0, 0, GW, GH);
      }

      // ── Clouds ─────────────────────────────────────────────────────────
      for (const c of clouds.current) {
        c.x -= curScroll * c.speed;
        if (c.x < -(c.r * 3)) c.x = GW + c.r * 3;
        drawCloud(ctx, c.x, c.y, c.r);
      }

      // ── Physics ────────────────────────────────────────────────────────
      hatVY.current += GRAVITY;
      hatY.current  += hatVY.current;

      // ── Pipe cluster spawn ─────────────────────────────────────────────
      if (lastPipeTs.current === 0) lastPipeTs.current = ts;
      if (ts - lastPipeTs.current >= curInterval) {
        addPipeCluster();
        lastPipeTs.current = ts;
      }

      // ── Free coin spawn ────────────────────────────────────────────────
      if (lastFreeCoinTs.current === 0) lastFreeCoinTs.current = ts;
      if (ts - lastFreeCoinTs.current >= coinInterval && freeCoins.current.filter(c => !c.collected).length < 4) {
        spawnFreeCoin();
        lastFreeCoinTs.current = ts;
      }

      // ── Free coins: draw + collect ─────────────────────────────────────
      freeCoins.current = freeCoins.current.filter(c => c.x > -COIN_R * 4);
      for (const fc of freeCoins.current) {
        fc.x -= curScroll;
        if (fc.collected) continue;
        drawCoin(ctx, fc.x, fc.y, COIN_R, ts);

        // Collect check
        const hcx = HAT_X + HAT_W / 2;
        const hcy = hatY.current + HAT_H / 2;
        if (Math.abs(fc.x - hcx) < HAT_W / 2 + COIN_R && Math.abs(fc.y - hcy) < HAT_H / 2 + COIN_R) {
          fc.collected = true;
          scoreRef.current += 25;
          const nb = Math.floor(scoreRef.current / 100);
          if (nb > bthRef.current) { bthRef.current = nb; setBthEarned(nb); }
          setScore(scoreRef.current);
          spawnParticles(fc.x, fc.y, GOLD, 10);
          spawnFloat(fc.x, fc.y - 20, "+25 $BTH", GOLD);
          Sounds.playCoin();
        }
      }

      // ── Pipes: draw + coin + pass + collision ──────────────────────────
      let dead = false;
      for (const pipe of pipes.current) {
        pipe.x -= curScroll;
        const bottomY = pipe.gapTop + curGap;
        const bottomH = floorY - bottomY;

        drawPipePair(ctx, pipe.x, pipe.gapTop, bottomY, PIPE_W, CAP_H, floorY);

        // Gap coin (on last pipe of a cluster only)
        if (pipe.hasCoin && !pipe.coinCollected) {
          const cx = pipe.x + PIPE_W / 2;
          const cy = pipe.gapTop + curGap / 2;
          drawCoin(ctx, cx, cy, COIN_R, ts);

          const hcx = HAT_X + HAT_W / 2;
          const hcy = hatY.current + HAT_H / 2;
          if (Math.abs(cx - hcx) < HAT_W / 2 + COIN_R && Math.abs(cy - hcy) < HAT_H / 2 + COIN_R) {
            pipe.coinCollected = true;
            scoreRef.current += 25;
            const nb = Math.floor(scoreRef.current / 100);
            if (nb > bthRef.current) { bthRef.current = nb; setBthEarned(nb); }
            setScore(scoreRef.current);
            spawnParticles(cx, cy, GOLD, 10);
            spawnFloat(cx, cy - 20, "+25 $BTH", GOLD);
            Sounds.playCoin();
          }
        }

        // Pass pipe
        if (pipe.x + PIPE_W < HAT_X && !pipe.passed) {
          pipe.passed = true;
          scoreRef.current += 10;
          pipesPassedRef.current++;
          const nb = Math.floor(scoreRef.current / 100);
          if (nb > bthRef.current) { bthRef.current = nb; setBthEarned(nb); }
          setScore(scoreRef.current);
          Sounds.playScore();

          const newLv = Math.min(100, Math.floor(pipesPassedRef.current / 3) + 1);
          if (newLv > levelRef.current) {
            levelRef.current = newLv;
            setLevel(newLv);
            spawnFloat(GW / 2, GH * 0.38, `LEVEL ${newLv}!`, "#44ff88");
          }
          spawnFloat(HAT_X + HAT_W + 12, hatY.current + HAT_H / 2, "+10", "#ffffff");
        }

        // Collision (20% shrunk hitbox)
        const hx = HAT_X + HAT_W * 0.20;
        const hy = hatY.current + HAT_H * 0.10;
        const hw = HAT_W * 0.60;
        const hh = HAT_H * 0.80;
        if (hx < pipe.x + PIPE_W && hx + hw > pipe.x &&
            (hy < pipe.gapTop || hy + hh > bottomY)) {
          dead = true; break;
        }
        void bottomH;
      }

      pipes.current = pipes.current.filter(p => p.x > -PIPE_W * 2);

      if (!dead && (hatY.current + HAT_H > floorY || hatY.current < 0)) dead = true;

      if (dead) {
        spawnParticles(HAT_X + HAT_W / 2, hatY.current + HAT_H / 2, "#ff6688", 22);
        shakeRef.current = 14;
        ctx.restore();
        triggerGameOver();
        return;
      }

      // ── Ground ─────────────────────────────────────────────────────────
      ctx.fillStyle = GROUND_DARK;
      ctx.fillRect(0, floorY, GW, GROUND_H);
      ctx.fillStyle = GROUND_LIGHT;
      ctx.fillRect(0, floorY, GW, GROUND_H * 0.14);

      // ── Hat ────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(HAT_X + HAT_W / 2, hatY.current + HAT_H / 2);
      ctx.rotate(Math.max(-Math.PI / 4, Math.min(Math.PI / 4, hatVY.current * 0.08)));
      ctx.imageSmoothingEnabled = false;
      if (hatImg.current) {
        ctx.drawImage(hatImg.current, -HAT_W / 2, -HAT_H / 2, HAT_W, HAT_H);
      } else {
        ctx.fillStyle = "#ff69b4";
        ctx.fillRect(-HAT_W / 2, -HAT_H / 2, HAT_W, HAT_H);
      }
      ctx.restore();

      // ── Particles ──────────────────────────────────────────────────────
      particles.current = particles.current.filter(p => p.age < p.life);
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.age++;
        ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // ── Float texts ────────────────────────────────────────────────────
      floatTexts.current = floatTexts.current.filter(t => t.age < t.life);
      for (const t of floatTexts.current) {
        t.y -= 0.9; t.age++;
        ctx.globalAlpha = Math.max(0, 1 - t.age / t.life);
        ctx.font = `bold ${d.FLOAT_SIZE}px ${FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText(t.text, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      // ── HUD ────────────────────────────────────────────────────────────
      const pad = GH * 0.03;
      ctx.lineWidth = 3;

      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = `bold ${d.SCORE_SIZE}px ${FONT}`;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(String(scoreRef.current), GW / 2, pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(scoreRef.current), GW / 2, pad);

      ctx.font = `bold ${d.BTH_SIZE}px ${FONT}`;
      const bthY = pad + d.SCORE_SIZE + 4;
      ctx.strokeText(`$BTH ${bthRef.current}`, GW / 2, bthY);
      ctx.fillStyle = GOLD;
      ctx.fillText(`$BTH ${bthRef.current}`, GW / 2, bthY);

      // Level badge (top-right, color shifts red as level rises)
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.font = `bold ${d.LVL_SIZE}px ${FONT}`;
      const lvColor = lv >= 50 ? "#ff4444" : lv >= 20 ? "#ff9900" : "#44ff88";
      ctx.strokeText(`LVL ${lv}`, GW - pad, pad);
      ctx.fillStyle = lvColor;
      ctx.fillText(`LVL ${lv}`, GW - pad, pad);

      ctx.restore();

      if (phaseRef.current === "playing") {
        frameId.current = requestAnimationFrame(loopRef.current);
      }
    };
  });

  // ── Input ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { cancelAnimationFrame(frameId.current); }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const cdColor = COUNTDOWN_COLORS[countdown] ?? "#ffffff";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000", touchAction: "none", userSelect: "none", overflow: "hidden" }}
      onPointerDown={flap}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
      />

      {phase === "countdown" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div
            key={String(countdown)}
            style={{ fontFamily: FONT, fontWeight: "bold", fontSize: "clamp(80px,18vmin,200px)", color: cdColor, textShadow: `0 0 40px ${cdColor}, 0 0 80px ${cdColor}`, animation: "cdShrink 1s ease-out forwards" }}
          >
            {countdown}
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "rgba(8,12,28,0.92)", border: "1.5px solid rgba(255,215,0,0.55)", borderRadius: "12px", padding: "clamp(20px,4vw,36px) clamp(18px,4vw,32px)", width: "100%", maxWidth: "380px", boxShadow: "0 0 16px rgba(255,215,0,0.3)", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <div style={{ color: "#ff4466", fontSize: "clamp(20px,4vw,30px)", fontWeight: "bold", textAlign: "center", textShadow: "0 0 20px rgba(255,68,102,0.6)" }}>GAME OVER</div>
            <div style={{ width: "100%", borderTop: "1px solid rgba(255,215,0,0.2)", borderBottom: "1px solid rgba(255,215,0,0.2)", padding: "14px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Row label="SCORE"       value={String(score)}   color="#ffffff" />
              <Row label="LEVEL"       value={String(level)}   color="#44ff88" />
              <Row label="$BTH EARNED" value={`+${bthEarned}`} color={GOLD} />
              {finalResult?.isHighScore && <div style={{ color: "#aaaaff", textAlign: "center", fontSize: "clamp(10px,1.4vw,14px)", marginTop: "4px" }}>NEW HIGH SCORE!</div>}
              {finalResult?.rank != null && <div style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", fontSize: "clamp(10px,1.3vw,13px)" }}>GLOBAL RANK #{finalResult.rank}</div>}
            </div>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
              <GoldBtn onClick={() => setPhase("countdown")}>PLAY AGAIN</GoldBtn>
              <GhostBtn onClick={() => setLocation("/leaderboard")}>LEADERBOARD</GhostBtn>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes cdShrink{from{transform:scale(1.6)}to{transform:scale(1.0)}}`}</style>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px,1.5vw,14px)", color: "rgba(255,255,255,0.70)", fontFamily: '"Courier New",monospace' }}>
      <span>{label}</span><span style={{ color }}>{value}</span>
    </div>
  );
}

function GoldBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "clamp(10px,2vw,16px)", background: "rgba(255,215,0,0.18)", border: "1.5px solid rgba(255,215,0,0.55)", borderRadius: "8px", color: "#ffd700", fontFamily: '"Courier New",monospace', fontWeight: "bold", fontSize: "clamp(12px,2vw,18px)", cursor: "pointer", letterSpacing: "0.05em" }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "clamp(8px,1.6vw,13px)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,215,0,0.30)", borderRadius: "8px", color: "rgba(255,215,0,0.75)", fontFamily: '"Courier New",monospace', fontSize: "clamp(11px,1.6vw,16px)", cursor: "pointer", letterSpacing: "0.04em" }}>{children}</button>
  );
}
