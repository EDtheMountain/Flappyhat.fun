import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useSubmitScore } from "@workspace/api-client-react";
import wifhatSrc from "@assets/Wifhat_1781355793327.png";
import tubeSrc from "@assets/Tube_1781361762703.webp";
import bgSrc from "@assets/Background_1_1781361780648.png";
import * as Sounds from "@/lib/sounds";

// ── Types ────────────────────────────────────────────────────────────────────
type Pipe = { x: number; gapTop: number; passed: boolean; hasCoin: boolean; coinCollected: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; life: number; age: number };
type FloatText = { x: number; y: number; text: string; color: string; age: number; life: number };
type Phase = "countdown" | "playing" | "gameover";

// ── Design System Colors ─────────────────────────────────────────────────────
const SKY = "#55e2eb";
const GOLD = "#ffd700";
const GOLD_DARK = "#b89000";
const GOLD_LETTER = "#9a7800";
const GROUND_DARK = "#3a6025";
const GROUND_LIGHT = "#4a7830";
const FONT = '"Courier New", monospace';

const COUNTDOWN_COLORS: Record<string | number, string> = {
  3: "#ff4444",
  2: "#ff9900",
  1: "#ffdd00",
  "GO!": "#44ff88",
};

// ── Derived constants from canvas size ───────────────────────────────────────
function makeDims(GW: number, GH: number) {
  const PIPE_W = GH * 0.092;
  const HAT_W = GH * 0.115;
  return {
    GW, GH,
    GRAVITY:    GH * 0.00063,
    FLAP:      -(GH * 0.013),
    SCROLL:     GW / 140,
    PIPE_GAP:   GH * 0.275,
    PIPE_W,
    CAP_H:      PIPE_W * 0.50,
    GROUND_H:   GH * 0.115,
    HAT_W,
    HAT_H:      HAT_W * 0.80,
    HAT_X:      GW * 0.22,
    MIN_TOP:    Math.max(PIPE_W * 0.50 + 18, GH * 0.16),
    SCORE_SIZE: Math.round(GH * 0.036),
    BTH_SIZE:   Math.round(GH * 0.030),
    FLOAT_SIZE: Math.round(GH * 0.022),
  };
}
type Dims = ReturnType<typeof makeDims>;

export default function Game() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
  const submitScore = useSubmitScore();

  // ── Canvas & images ──────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hatImg    = useRef<HTMLImageElement | null>(null);
  const tubeImg   = useRef<HTMLImageElement | null>(null);
  const bgImg     = useRef<HTMLImageElement | null>(null);

  // ── Dims (computed once on mount) ────────────────────────────────────────
  const D = useRef<Dims>(makeDims(400, 600));

  // ── UI state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>("countdown");
  const [countdown, setCountdown]   = useState<number | string>(3);
  const [score, setScore]           = useState(0);
  const [bthEarned, setBthEarned]   = useState(0);
  const [finalResult, setFinalResult] = useState<{ isHighScore: boolean; rank?: number | null } | null>(null);

  // ── Mutable game state (all refs, no stale-closure risk) ─────────────────
  const phaseRef    = useRef<Phase>("countdown");
  const hatY        = useRef(0);
  const hatVY       = useRef(0);
  const pipes       = useRef<Pipe[]>([]);
  const particles   = useRef<Particle[]>([]);
  const floatTexts  = useRef<FloatText[]>([]);
  const scoreRef    = useRef(0);
  const bthRef      = useRef(0);
  const shakeRef    = useRef(0);
  const bgOffset    = useRef(0);
  const lastPipeTs  = useRef(0);
  const frameId     = useRef(0);
  // The actual RAF callback is stored in a ref so it is always current
  const loopRef     = useRef<FrameRequestCallback>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Load images ──────────────────────────────────────────────────────────
  useEffect(() => {
    ([
      [wifhatSrc, hatImg],
      [tubeSrc,   tubeImg],
      [bgSrc,     bgImg],
    ] as [string, React.MutableRefObject<HTMLImageElement | null>][]).forEach(([src, ref]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { ref.current = img; };
    });
  }, []);

  // ── Init canvas size ─────────────────────────────────────────────────────
  useEffect(() => {
    const GW = window.innerWidth;
    const GH = window.innerHeight;
    D.current = makeDims(GW, GH);
    hatY.current = GH * 0.4;
    // Force canvas to correct size
    if (canvasRef.current) {
      canvasRef.current.width  = GW;
      canvasRef.current.height = GH;
    }
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addPipe = () => {
    const d = D.current;
    const maxTop = d.GH - d.GROUND_H - d.PIPE_GAP - d.MIN_TOP;
    const gapTop = d.MIN_TOP + Math.random() * Math.max(0, maxTop - d.MIN_TOP);
    pipes.current.push({ x: d.GW, gapTop, passed: false, hasCoin: Math.random() > 0.4, coinCollected: false });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, upward = false) => {
    for (let i = 0; i < count; i++) {
      const angle = upward
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
        : Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, size: 3 + Math.random() * 3, alpha: 1, life: 35, age: 0 });
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
        onSuccess: (data) => setFinalResult({ isHighScore: data.isHighScore, rank: data.rank }),
      });
    }
  };

  const startGame = () => {
    const d = D.current;
    hatY.current = d.GH * 0.4;
    hatVY.current = 0;
    pipes.current = [];
    particles.current = [];
    floatTexts.current = [];
    scoreRef.current = 0;
    bthRef.current = 0;
    shakeRef.current = 0;
    bgOffset.current = 0;
    lastPipeTs.current = 0;
    setScore(0);
    setBthEarned(0);
    setFinalResult(null);
    setPhase("playing");
    Sounds.playStart();
    addPipe();
    frameId.current = requestAnimationFrame(loopRef.current);
  };

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    let count = 3;
    setCountdown(count);
    Sounds.playCountdown(count as 1 | 2 | 3);
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        Sounds.playCountdown(count as 1 | 2 | 3);
      } else if (count === 0) {
        setCountdown("GO!");
        Sounds.playGo();
      } else {
        clearInterval(timer);
        startGame();
      }
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Game loop (updated every render so it always reads latest state) ──────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loopRef.current = (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const d = D.current;
      const { GW, GH, GRAVITY, SCROLL, PIPE_GAP, PIPE_W, GROUND_H, HAT_W, HAT_H, HAT_X } = d;
      const floorY = GH - GROUND_H;

      ctx.imageSmoothingEnabled = false;
      ctx.save();

      // Screen shake
      if (shakeRef.current > 0.5) {
        ctx.translate((Math.random() * 2 - 1) * shakeRef.current, (Math.random() * 2 - 1) * shakeRef.current);
        shakeRef.current *= 0.78;
      }

      // ── Scrolling background ──────────────────────────────────────────
      bgOffset.current += SCROLL * 0.5;
      if (bgImg.current && bgImg.current.naturalWidth > 0) {
        const iw = bgImg.current.naturalWidth;
        const ih = bgImg.current.naturalHeight;
        const scale = GH / ih;
        const sw = iw * scale;
        const off = bgOffset.current % sw;
        for (let x = -off; x < GW + sw; x += sw) {
          ctx.drawImage(bgImg.current, x, 0, sw, GH);
        }
      } else {
        ctx.fillStyle = SKY;
        ctx.fillRect(0, 0, GW, GH);
      }

      // ── Physics ───────────────────────────────────────────────────────
      hatVY.current += GRAVITY;
      hatY.current += hatVY.current;

      // ── Pipe spawn (1900 ms interval) ─────────────────────────────────
      if (lastPipeTs.current === 0) lastPipeTs.current = ts;
      if (ts - lastPipeTs.current >= 1900) {
        addPipe();
        lastPipeTs.current = ts;
      }

      // ── Pipes ─────────────────────────────────────────────────────────
      let dead = false;
      for (const pipe of pipes.current) {
        pipe.x -= SCROLL;
        const bottomY = pipe.gapTop + PIPE_GAP;
        const bottomH = floorY - bottomY;

        if (tubeImg.current) {
          // Top pipe (cap naturally at bottom, faces the gap)
          if (pipe.gapTop > 0) {
            ctx.drawImage(tubeImg.current, pipe.x, 0, PIPE_W, pipe.gapTop);
          }
          // Bottom pipe: flip vertically so cap faces up into the gap
          if (bottomH > 0) {
            ctx.save();
            ctx.translate(pipe.x + PIPE_W / 2, bottomY + bottomH / 2);
            ctx.scale(1, -1);
            ctx.drawImage(tubeImg.current, -PIPE_W / 2, -bottomH / 2, PIPE_W, bottomH);
            ctx.restore();
          }
        } else {
          // Fallback drawn pipes
          ctx.fillStyle = "#4ab845";
          ctx.fillRect(pipe.x, 0, PIPE_W, pipe.gapTop);
          ctx.fillRect(pipe.x, bottomY, PIPE_W, bottomH);
          ctx.fillStyle = "#40b858";
          const cap = PIPE_W * 0.5;
          const overhang = PIPE_W * 0.055;
          ctx.fillRect(pipe.x - overhang, pipe.gapTop - cap, PIPE_W + overhang * 2, cap);
          ctx.fillRect(pipe.x - overhang, bottomY, PIPE_W + overhang * 2, cap);
        }

        // ── Coin ──────────────────────────────────────────────────────
        if (pipe.hasCoin && !pipe.coinCollected) {
          const cx = pipe.x + PIPE_W / 2;
          const cy = pipe.gapTop + PIPE_GAP / 2;
          const pulse = 1 + Math.sin(ts * 0.008) * 0.07;
          const r = PIPE_W * 0.22 * pulse;

          // Glow
          const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 1.7);
          glow.addColorStop(0, "rgba(255,215,0,0.55)");
          glow.addColorStop(1, "rgba(255,215,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill();

          // Body
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = GOLD; ctx.fill();
          ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = GOLD_LETTER;
          ctx.font = `bold ${Math.round(r * 1.1)}px ${FONT}`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("B", cx, cy + 1);

          // Collect check
          const hcx = HAT_X + HAT_W / 2;
          const hcy = hatY.current + HAT_H / 2;
          if (Math.abs(cx - hcx) < HAT_W / 2 + r && Math.abs(cy - hcy) < HAT_H / 2 + r) {
            pipe.coinCollected = true;
            scoreRef.current += 25;
            const newBth = Math.floor(scoreRef.current / 100);
            if (newBth > bthRef.current) { bthRef.current = newBth; setBthEarned(newBth); }
            setScore(scoreRef.current);
            spawnParticles(cx, cy, GOLD, 10);
            spawnFloat(cx, cy - 20, "+25 $BTH", GOLD);
            Sounds.playCoin();
          }
        }

        // ── Pass pipe ─────────────────────────────────────────────────
        if (pipe.x + PIPE_W < HAT_X && !pipe.passed) {
          pipe.passed = true;
          scoreRef.current += 10;
          const newBth = Math.floor(scoreRef.current / 100);
          if (newBth > bthRef.current) { bthRef.current = newBth; setBthEarned(newBth); }
          setScore(scoreRef.current);
          spawnFloat(HAT_X + HAT_W + 10, hatY.current + HAT_H / 2, "+10", "#ffffff");
          Sounds.playScore();
        }

        // ── Collision (20% shrunk hitbox) ─────────────────────────────
        const hx = HAT_X + HAT_W * 0.2;
        const hy = hatY.current + HAT_H * 0.1;
        const hw = HAT_W * 0.6;
        const hh = HAT_H * 0.8;
        if (
          hx < pipe.x + PIPE_W && hx + hw > pipe.x &&
          (hy < pipe.gapTop || hy + hh > bottomY)
        ) { dead = true; break; }
      }

      // Cull off-screen pipes
      pipes.current = pipes.current.filter(p => p.x > -PIPE_W);

      // Floor / ceiling
      if (!dead && (hatY.current + HAT_H > floorY || hatY.current < 0)) dead = true;

      if (dead) {
        spawnParticles(HAT_X + HAT_W / 2, hatY.current + HAT_H / 2, "#ff6688", 22);
        shakeRef.current = 14;
        ctx.restore();
        triggerGameOver();
        return;
      }

      // ── Ground ────────────────────────────────────────────────────────
      ctx.fillStyle = GROUND_DARK;
      ctx.fillRect(0, floorY, GW, GROUND_H);
      ctx.fillStyle = GROUND_LIGHT;
      ctx.fillRect(0, floorY, GW, GROUND_H * 0.15);

      // ── Hat ───────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(HAT_X + HAT_W / 2, hatY.current + HAT_H / 2);
      ctx.rotate(Math.max(-Math.PI / 4, Math.min(Math.PI / 4, hatVY.current * 0.08)));
      if (hatImg.current) {
        ctx.drawImage(hatImg.current, -HAT_W / 2, -HAT_H / 2, HAT_W, HAT_H);
      } else {
        ctx.fillStyle = "#ff69b4";
        ctx.fillRect(-HAT_W / 2, -HAT_H / 2, HAT_W, HAT_H);
      }
      ctx.restore();

      // ── Particles ─────────────────────────────────────────────────────
      particles.current = particles.current.filter(p => p.age < p.life);
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.age++;
        ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // ── Float texts ───────────────────────────────────────────────────
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

      // ── HUD ───────────────────────────────────────────────────────────
      const pad = GH * 0.03;
      ctx.textAlign = "center"; ctx.textBaseline = "top";

      // Score
      ctx.font = `bold ${d.SCORE_SIZE}px ${FONT}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(String(scoreRef.current), GW / 2, pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(scoreRef.current), GW / 2, pad);

      // $BTH
      ctx.font = `bold ${d.BTH_SIZE}px ${FONT}`;
      const bthY = pad + d.SCORE_SIZE + 4;
      ctx.strokeText(`$BTH ${bthRef.current}`, GW / 2, bthY);
      ctx.fillStyle = GOLD;
      ctx.fillText(`$BTH ${bthRef.current}`, GW / 2, bthY);

      ctx.restore(); // restore shake

      if (phaseRef.current === "playing") {
        frameId.current = requestAnimationFrame(loopRef.current);
      }
    };
  });

  // ── Input ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { cancelAnimationFrame(frameId.current); }, []);

  // ── Render ───────────────────────────────────────────────────────────────
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

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.50)",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div
            key={String(countdown)}
            style={{
              fontFamily: FONT,
              fontWeight: "bold",
              fontSize: "clamp(80px, 18vmin, 200px)",
              color: cdColor,
              textShadow: `0 0 40px ${cdColor}, 0 0 80px ${cdColor}`,
              animation: "cdShrink 1s ease-out forwards",
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {phase === "gameover" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}>
          <div style={{
            background: "rgba(8,12,28,0.92)",
            border: "1.5px solid rgba(255,215,0,0.55)",
            borderRadius: "12px",
            padding: "clamp(20px, 4vw, 36px) clamp(18px, 4vw, 32px)",
            width: "100%",
            maxWidth: "380px",
            boxShadow: "0 0 16px rgba(255,215,0,0.3)",
            fontFamily: FONT,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
          }}>
            <div style={{ color: "#ff4466", fontSize: "clamp(20px, 4vw, 30px)", fontWeight: "bold", textAlign: "center", textShadow: "0 0 20px rgba(255,68,102,0.6)" }}>
              GAME OVER
            </div>

            <div style={{ width: "100%", borderTop: "1px solid rgba(255,215,0,0.2)", borderBottom: "1px solid rgba(255,215,0,0.2)", padding: "14px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
              <ScoreRow label="SCORE" value={String(score)} color="#ffffff" />
              <ScoreRow label="$BTH EARNED" value={`+${bthEarned}`} color={GOLD} />
              {finalResult?.isHighScore && (
                <div style={{ color: "#aaaaff", textAlign: "center", fontSize: "clamp(10px, 1.4vw, 14px)", marginTop: "4px" }}>
                  NEW HIGH SCORE!
                </div>
              )}
              {finalResult?.rank != null && (
                <div style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", fontSize: "clamp(10px, 1.3vw, 13px)" }}>
                  GLOBAL RANK #{finalResult.rank}
                </div>
              )}
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
              <GoldBtn onClick={() => setPhase("countdown")}>PLAY AGAIN</GoldBtn>
              <GhostBtn onClick={() => setLocation("/leaderboard")}>LEADERBOARD</GhostBtn>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cdShrink {
          from { transform: scale(1.6); }
          to   { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(10px, 1.5vw, 14px)", color: "rgba(255,255,255,0.70)", fontFamily: '"Courier New", monospace' }}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function GoldBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "clamp(10px, 2vw, 16px)",
      background: "rgba(255,215,0,0.18)", border: "1.5px solid rgba(255,215,0,0.55)",
      borderRadius: "8px", color: "#ffd700",
      fontFamily: '"Courier New", monospace', fontWeight: "bold",
      fontSize: "clamp(12px, 2vw, 18px)", cursor: "pointer", letterSpacing: "0.05em",
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "clamp(8px, 1.6vw, 13px)",
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,215,0,0.30)",
      borderRadius: "8px", color: "rgba(255,215,0,0.75)",
      fontFamily: '"Courier New", monospace',
      fontSize: "clamp(11px, 1.6vw, 16px)", cursor: "pointer", letterSpacing: "0.04em",
    }}>{children}</button>
  );
}
