import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import wifhatImg from "@assets/Wifhat_1781355793327.png";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-8 relative z-10">

        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary drop-shadow-[0_4px_0_hsl(var(--primary-foreground))] animate-pulse leading-tight tracking-wider">
            FLAPPY<br />WIF HAT
          </h1>
          <p className="text-secondary text-sm drop-shadow-[0_2px_0_#000]">Get rich or rekt trying</p>
        </div>

        {/* Floating Hat Preview */}
        <div className="relative w-32 h-32 animate-[bounce_2s_infinite]">
          <img
            src={wifhatImg}
            alt="Wif Hat"
            className="w-full h-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Play Button */}
        <div className="w-full bg-card p-6 border-4 border-primary shadow-[8px_8px_0_hsl(var(--primary))]">
          <Button
            onClick={() => setLocation("/game")}
            className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 text-lg pixel-button"
          >
            PLAY NOW
          </Button>
        </div>

        {/* Leaderboard Link */}
        <Link href="/leaderboard">
          <span className="text-primary hover:text-white cursor-pointer transition-colors text-sm border-b-2 border-transparent hover:border-white pb-1">
            VIEW LEADERBOARD
          </span>
        </Link>
      </div>
    </div>
  );
}
