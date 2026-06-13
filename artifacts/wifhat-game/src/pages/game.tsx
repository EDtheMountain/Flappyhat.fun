import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useSubmitScore } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import wifhatImg from "@assets/Wifhat_1781355793327.png";
import { Loader2 } from "lucide-react";

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
  const { data: user, isLoading: userLoading } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
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

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    const img = new Image();
    img.src = wifhatImg;
    img.onload = () => {
      imgRef.current = img;
    };
  }, []);

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
  }, [gameState]);

  const startGame = () => {
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
  };

  const addPipe = () => {
    const minGapTop = 50;
    const maxGapTop = CANVAS_HEIGHT - gapRef.current - 150; // Leave room for floor
    const gapTop = Math.random() * (maxGapTop - minGapTop) + minGapTop;
    const hasCoin = Math.random() > 0.5; // 50% chance of a coin appearing
    pipes.current.push({ x: CANVAS_WIDTH, gapTop, passed: false, hasCoin, coinCollected: false });
  };

  const flap = () => {
    if (gameState === "playing") {
      hatVelocity.current = FLAP_STRENGTH;
    }
  };

  const gameOver = () => {
    setGameState("gameover");
    if (frameId.current) cancelAnimationFrame(frameId.current);
    
    // Submit score
    submitScore.mutate({ data: { score: scoreRef.current } }, {
      onSuccess: (data) => {
        setFinalResult({ isHighScore: data.isHighScore, rank: data.rank });
      }
    });
  };

  const gameLoop = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear & draw background
    ctx.fillStyle = "#87CEEB"; // Sky blue
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Physics
    hatVelocity.current += GRAVITY;
    hatY.current += hatVelocity.current;

    // Draw pipes
    pipes.current.forEach(pipe => {
      pipe.x -= speedRef.current;

      // Pipe styling
      ctx.fillStyle = "#2ecc71"; // Green
      ctx.strokeStyle = "#27ae60"; // Darker green
      ctx.lineWidth = 4;

      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
      
      // Bottom pipe
      const bottomPipeY = pipe.gapTop + gapRef.current;
      const bottomPipeHeight = CANVAS_HEIGHT - 50 - bottomPipeY; // 50 is floor height
      ctx.fillRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);
      ctx.strokeRect(pipe.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);

      // Draw Coin
      if (pipe.hasCoin && !pipe.coinCollected) {
        const coinX = pipe.x + PIPE_WIDTH / 2;
        const coinY = pipe.gapTop + gapRef.current / 2;
        
        ctx.beginPath();
        ctx.arc(coinX, coinY, 15, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd700"; // Gold
        ctx.fill();
        ctx.strokeStyle = "#b8860b";
        ctx.stroke();
        
        ctx.fillStyle = "#b8860b";
        ctx.font = "16px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("B", coinX, coinY + 2); // B for BTH

        // Coin collision check
        if (
          Math.abs(coinX - (50 + HAT_SIZE / 2)) < HAT_SIZE / 2 + 15 &&
          Math.abs(coinY - (hatY.current + HAT_SIZE / 2)) < HAT_SIZE / 2 + 15
        ) {
          pipe.coinCollected = true;
          // You only get BTH coins by passing pipes (300 points = 1 coin), but let's say collecting a coin gives you +50 points
          scoreRef.current += 50;
          setScore(scoreRef.current);
          bthRef.current = Math.floor(scoreRef.current / 300);
          setBthEarned(bthRef.current);
        }
      }

      // Pass pipe -> score
      if (pipe.x + PIPE_WIDTH < 50 && !pipe.passed) { // 50 is hat X
        pipe.passed = true;
        scoreRef.current += 10;
        setScore(scoreRef.current);

        // Update BTH coins
        bthRef.current = Math.floor(scoreRef.current / 300);
        setBthEarned(bthRef.current);

        // Progressive difficulty
        if (scoreRef.current % 100 === 0) {
          speedRef.current = Math.min(speedRef.current + 0.5, 7);
          gapRef.current = Math.max(gapRef.current - 5, 90);
        }
      }

      // Collision detection
      const hatRect = { x: 50 + 5, y: hatY.current + 5, w: HAT_SIZE - 10, h: HAT_SIZE - 10 };
      const topPipeRect = { x: pipe.x, y: 0, w: PIPE_WIDTH, h: pipe.gapTop };
      const bottomPipeRect = { x: pipe.x, y: bottomPipeY, w: PIPE_WIDTH, h: bottomPipeHeight };

      if (
        (hatRect.x < topPipeRect.x + topPipeRect.w && hatRect.x + hatRect.w > topPipeRect.x && hatRect.y < topPipeRect.y + topPipeRect.h) ||
        (hatRect.x < bottomPipeRect.x + bottomPipeRect.w && hatRect.x + hatRect.w > bottomPipeRect.x && hatRect.y + hatRect.h > bottomPipeRect.y)
      ) {
        gameOver();
      }
    });

    // Remove off-screen pipes and add new ones
    if (pipes.current.length > 0 && pipes.current[0].x < -PIPE_WIDTH) {
      pipes.current.shift();
    }
    if (pipes.current.length === 0 || pipes.current[pipes.current.length - 1].x < CANVAS_WIDTH - 200) {
      addPipe();
    }

    // Floor collision
    const floorY = CANVAS_HEIGHT - 50;
    if (hatY.current + HAT_SIZE > floorY || hatY.current < 0) {
      gameOver();
    }

    // Draw Floor
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, 50);
    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, 10); // Grass top

    // Draw Hat
    if (imgRef.current) {
      ctx.save();
      ctx.translate(50 + HAT_SIZE / 2, hatY.current + HAT_SIZE / 2);
      // Tilt based on velocity
      const tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (hatVelocity.current * 0.1)));
      ctx.rotate(tilt);
      ctx.drawImage(imgRef.current, -HAT_SIZE / 2, -HAT_SIZE / 2, HAT_SIZE, HAT_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(50, hatY.current, HAT_SIZE, HAT_SIZE);
    }

    // Draw HUD
    ctx.fillStyle = "white";
    ctx.font = "20px 'Press Start 2P'";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    // Score
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(`SCORE:${scoreRef.current}`, 10, 10);
    ctx.fillText(`SCORE:${scoreRef.current}`, 10, 10);

    // BTH
    ctx.fillStyle = "#ffd700";
    ctx.strokeText(`BTH:${bthRef.current}`, 10, 40);
    ctx.fillText(`BTH:${bthRef.current}`, 10, 40);

    if (gameState === "playing") {
      frameId.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  if (userLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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

        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="text-white text-6xl md:text-8xl font-bold animate-bounce drop-shadow-[0_4px_0_#000]">
              {countdown}
            </div>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
            <div className="bg-card border-4 border-primary p-6 flex flex-col items-center gap-6 w-full max-w-[300px] shadow-[8px_8px_0_hsl(var(--primary))] animate-in zoom-in-90 duration-200">
              <h2 className="text-3xl text-destructive drop-shadow-[0_2px_0_#fff] text-center animate-pulse">
                GAME OVER
              </h2>
              
              <div className="w-full space-y-4 bg-black/50 p-4 border border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">SCORE</span>
                  <span className="text-white font-bold">{score}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">BTH EARNED</span>
                  <span className="text-accent font-bold">+{bthEarned}</span>
                </div>
                {submitScore.isPending ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                ) : finalResult?.isHighScore ? (
                  <div className="text-center text-accent text-xs animate-bounce mt-2">
                    NEW HIGH SCORE!
                  </div>
                ) : null}
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
