import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useSubmitScore } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import wifhatImg from "@assets/Wifhat_1781355793327.png";
import { playFlap, playCoin, playGameOver, playScore } from "@/lib/sounds";

// Game Constants
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const HAT_SIZE = 40;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export default function Game() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
  const submitScore = useSubmitScore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"countdown" | "playing" | "gameover">("countdown");
  const [countdown, setCountdown] = useState<number | string>(3);
  const [score, setScore] = useState(0);
  const [bthEarned, setBthEarned] = useState(0);
  const [finalResult, setFinalResult] = useState<{ isHighScore: boolean; rank?: number | null } | null>(null);

  // Game State Refs
  const hatY = useRef(CANVAS_HEIGHT / 2);
  const hatVelocity = useRef(0);
  const pipes = useRef<{ x: number; gapTop: number; passed: boolean; hasCoin: boolean; coinCollected: boolean }[]>([]);
  const frameId = useRef<number>();
  const scoreRef = useRef(0);
  const bthRef = useRef(0);
  const speedRef = useRef(PIPE_SPEED);
  const gapRef = useRef(PIPE_GAP);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const gameStateRef = useRef<"countdown" | "playing" | "gameover">("countdown");

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load hat image
  useEffect(() => {
    const img = new Image();
    img.src = wifhatImg;
    img.onload = () => { imgRef.current = img; };
  }, []);

  // Countdown
  useEffect(() => {
    if (gameState === "countdown") {
      let count = 3;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else if (count === 0) {
          setCountdown("GO!");
        } else {
          clearInterval(timer);
          startGame();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const addPipe = () => {
    const minGapTop = 60;
    const maxGapTop = CANVAS_HEIGHT - gapRef.current - 100;
    const gapTop = Math.random() * (maxGapTop - minGapTop) + minGapTop;
    const hasCoin = Math.random() > 0.4;
    pipes.current.push({ x: CANVAS_WIDTH, gapTop, passed: false, hasCoin, coinCollected: false });
  };

  const flap = useCallback(() => {
    if (gameStateRef.current === "playing") {
      hatVelocity.current = FLAP_STRENGTH;
      playFlap();
    }
  }, []);

  const gameOver = useCallback(() => {
    setGameState("gameover");
    if (frameId.current) cancelAnimationFrame(frameId.current);
    playGameOver();

    if (user) {
      submitScore.mutate({ data: { score: scoreRef.current } }, {
        onSuccess: (data) => {
          setFinalResult({ isHighScore: data.isHighScore, rank: data.rank });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const gameLoop = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - 50);
    grad.addColorStop(0, "#5bc8f5");
    grad.addColorStop(1, "#87CEEB");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Physics
    hatVelocity.current += GRAVITY;
    hatY.current += hatVelocity.current;

    // Draw pipes
    pipes.current.forEach(pipe => {
      pipe.x -= speedRef.current;

      const bottomPipeY = pipe.gapTop + gapRef.current;
      const bottomPipeHeight = CANVAS_HEIGHT - 50 - bottomPipeY;

      // Pipe body
      ctx.fillStyle = "#3dba4e";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
      ctx.fillRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);

      // Pipe cap (top)
      ctx.fillStyle = "#2a9e3d";
      ctx.fillRect(pipe.x - 5, pipe.gapTop - 18, PIPE_WIDTH + 10, 18);
      // Pipe cap (bottom)
      ctx.fillRect(pipe.x - 5, bottomPipeY, PIPE_WIDTH + 10, 18);

      // Pipe highlights
      ctx.fillStyle = "#5de06e";
      ctx.fillRect(pipe.x + 4, 0, 8, pipe.gapTop - 18);
      ctx.fillRect(pipe.x + 4, bottomPipeY + 18, 8, bottomPipeHeight - 18);

      // Coin
      if (pipe.hasCoin && !pipe.coinCollected) {
        const coinX = pipe.x + PIPE_WIDTH / 2;
        const coinY = pipe.gapTop + gapRef.current / 2;

        // Glow
        const glowGrad = ctx.createRadialGradient(coinX, coinY, 2, coinX, coinY, 20);
        glowGrad.addColorStop(0, "rgba(255,215,0,0.6)");
        glowGrad.addColorStop(1, "rgba(255,215,0,0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(coinX, coinY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Coin body
        ctx.beginPath();
        ctx.arc(coinX, coinY, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd700";
        ctx.fill();
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 2;
        ctx.stroke();

        // "B" label
        ctx.fillStyle = "#7a5500";
        ctx.font = "bold 12px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("B", coinX, coinY + 1);

        // Coin collision
        if (
          Math.abs(coinX - (50 + HAT_SIZE / 2)) < HAT_SIZE / 2 + 14 &&
          Math.abs(coinY - (hatY.current + HAT_SIZE / 2)) < HAT_SIZE / 2 + 14
        ) {
          pipe.coinCollected = true;
          scoreRef.current += 50;
          setScore(scoreRef.current);
          bthRef.current = Math.floor(scoreRef.current / 300);
          setBthEarned(bthRef.current);
          playCoin();
        }
      }

      // Pass pipe → score
      if (pipe.x + PIPE_WIDTH < 50 && !pipe.passed) {
        pipe.passed = true;
        scoreRef.current += 10;
        setScore(scoreRef.current);
        bthRef.current = Math.floor(scoreRef.current / 300);
        setBthEarned(bthRef.current);
        playScore();

        // Progressive difficulty every 100 pts
        if (scoreRef.current % 100 === 0) {
          speedRef.current = Math.min(speedRef.current + 0.5, 7);
          gapRef.current = Math.max(gapRef.current - 5, 90);
        }
      }

      // Collision detection (shrunk hitbox for fairness)
      const hatRect = { x: 50 + 8, y: hatY.current + 6, w: HAT_SIZE - 16, h: HAT_SIZE - 10 };
      const topPipeRect = { x: pipe.x, y: 0, w: PIPE_WIDTH, h: pipe.gapTop };
      const bottomPipeRect = { x: pipe.x, y: bottomPipeY, w: PIPE_WIDTH, h: bottomPipeHeight };

      const hitTop =
        hatRect.x < topPipeRect.x + topPipeRect.w &&
        hatRect.x + hatRect.w > topPipeRect.x &&
        hatRect.y < topPipeRect.y + topPipeRect.h;
      const hitBottom =
        hatRect.x < bottomPipeRect.x + bottomPipeRect.w &&
        hatRect.x + hatRect.w > bottomPipeRect.x &&
        hatRect.y + hatRect.h > bottomPipeRect.y;

      if (hitTop || hitBottom) {
        gameOver();
        return;
      }
    });

    // Remove off-screen pipes
    if (pipes.current.length > 0 && pipes.current[0].x < -PIPE_WIDTH) {
      pipes.current.shift();
    }
    if (pipes.current.length === 0 || pipes.current[pipes.current.length - 1].x < CANVAS_WIDTH - 200) {
      addPipe();
    }

    // Floor/ceiling collision
    const floorY = CANVAS_HEIGHT - 50;
    if (hatY.current + HAT_SIZE > floorY || hatY.current < 0) {
      gameOver();
      return;
    }

    // Floor
    ctx.fillStyle = "#c8b560";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, 50);
    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, 12);

    // Hat
    if (imgRef.current) {
      ctx.save();
      ctx.translate(50 + HAT_SIZE / 2, hatY.current + HAT_SIZE / 2);
      const tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, hatVelocity.current * 0.09));
      ctx.rotate(tilt);
      ctx.drawImage(imgRef.current, -HAT_SIZE / 2, -HAT_SIZE / 2, HAT_SIZE, HAT_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(50, hatY.current, HAT_SIZE, HAT_SIZE);
    }

    // HUD — score
    const hudFont = "14px 'Press Start 2P'";
    ctx.font = hudFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = 3;

    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.strokeText(`${scoreRef.current}`, 10, 10);
    ctx.fillText(`${scoreRef.current}`, 10, 10);

    // HUD — BTH coins
    ctx.strokeStyle = "black";
    ctx.fillStyle = "#ffd700";
    ctx.strokeText(`BTH: ${bthRef.current}`, 10, 34);
    ctx.fillText(`BTH: ${bthRef.current}`, 10, 34);

    if (gameStateRef.current === "playing") {
      frameId.current = requestAnimationFrame(gameLoop);
    }
  }, [gameOver]);

  const startGame = useCallback(() => {
    hatY.current = CANVAS_HEIGHT / 2;
    hatVelocity.current = 0;
    pipes.current = [];
    scoreRef.current = 0;
    bthRef.current = 0;
    speedRef.current = PIPE_SPEED;
    gapRef.current = PIPE_GAP;
    setScore(0);
    setBthEarned(0);
    setFinalResult(null);
    setGameState("playing");
    addPipe();
    frameId.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flap]);

  // Cancel animation on unmount
  useEffect(() => {
    return () => { if (frameId.current) cancelAnimationFrame(frameId.current); };
  }, []);

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center bg-zinc-900 touch-none select-none"
      onPointerDown={flap}
    >
      <div className="relative w-full max-w-[400px] aspect-[2/3] max-h-[100dvh] bg-black overflow-hidden shadow-2xl border-x-4 border-zinc-800">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-fill"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Countdown overlay */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="text-white text-7xl md:text-8xl font-bold drop-shadow-[0_4px_0_hsl(var(--primary))] animate-bounce" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
            <div className="bg-card border-4 border-primary p-6 flex flex-col items-center gap-5 w-full max-w-[300px] shadow-[8px_8px_0_hsl(var(--primary))]">
              <h2 className="text-2xl text-destructive text-center animate-pulse" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                GAME<br />OVER
              </h2>

              <div className="w-full space-y-3 bg-black/50 p-4 border border-border text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">SCORE</span>
                  <span className="text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">BTH</span>
                  <span className="text-yellow-400">+{bthEarned}</span>
                </div>
                {finalResult?.isHighScore && (
                  <div className="text-center text-accent text-xs animate-bounce pt-1">
                    NEW HIGH SCORE!
                  </div>
                )}
                {finalResult?.rank && (
                  <div className="text-center text-muted-foreground text-xs pt-1">
                    RANK #{finalResult.rank}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => setGameState("countdown")}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 pixel-button h-12"
                >
                  PLAY AGAIN
                </Button>
                <Button
                  onClick={() => setLocation("/leaderboard")}
                  variant="outline"
                  className="w-full bg-transparent text-white border-2 border-primary hover:bg-primary/20 pixel-button h-12"
                >
                  LEADERBOARD
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
