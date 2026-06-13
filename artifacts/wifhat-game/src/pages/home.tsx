import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useGuestLogin, useGetTwitterAuthUrl } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import wifhatImg from "@assets/Wifhat_1781355793327.png";
import { SiX } from "react-icons/si";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
  const { data: twitterUrlData } = useGetTwitterAuthUrl({ query: { enabled: !user, queryKey: ['getTwitterAuthUrl'] } });
  const guestLogin = useGuestLogin();
  
  const [username, setUsername] = useState("");

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    guestLogin.mutate({ data: { username } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/game");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-8 relative z-10">
        
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary drop-shadow-[0_4px_0_hsl(var(--primary-foreground))] animate-pulse leading-tight tracking-wider">
            FLAPPY<br/>WIF HAT
          </h1>
          <p className="text-secondary text-sm drop-shadow-[0_2px_0_#000]">Get rich or rekt trying</p>
        </div>

        {/* Floating Hat Preview */}
        <div className="relative w-32 h-32 animate-[bounce_2s_infinite]">
          <img 
            src={wifhatImg} 
            alt="Wif Hat Preview" 
            className="w-full h-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Auth / Action Section */}
        <div className="w-full bg-card p-6 border-4 border-primary shadow-[8px_8px_0_hsl(var(--primary))] flex flex-col gap-6">
          {user ? (
            <div className="text-center flex flex-col gap-4">
              <p className="text-lg">Welcome back, <span className="text-accent">{user.displayName}</span>!</p>
              <Button 
                onClick={() => setLocation("/game")}
                className="w-full h-14 bg-accent text-accent-foreground hover:bg-accent/90 text-lg pixel-button"
                data-testid="button-play"
              >
                PLAY NOW
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <Button 
                asChild
                className="w-full h-14 bg-black text-white hover:bg-zinc-800 text-sm pixel-button flex items-center gap-3"
                data-testid="button-twitter-auth"
              >
                <a href={twitterUrlData?.url || "#"}>
                  <SiX className="w-5 h-5" />
                  Sign in with X
                </a>
              </Button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-muted-foreground/30"></div>
                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs">OR</span>
                <div className="flex-grow border-t border-muted-foreground/30"></div>
              </div>

              <form onSubmit={handleGuestLogin} className="flex flex-col gap-3">
                <Input 
                  placeholder="Enter guest name" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 bg-black text-white border-2 border-secondary font-sans text-xs focus-visible:ring-secondary"
                  data-testid="input-guest-name"
                  maxLength={15}
                />
                <Button 
                  type="submit" 
                  disabled={guestLogin.isPending || !username.trim()}
                  className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs pixel-button"
                  data-testid="button-guest-login"
                >
                  PLAY AS GUEST
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Leaderboard Link */}
        <Link href="/leaderboard" className="mt-4">
          <span className="text-primary hover:text-white cursor-pointer transition-colors text-sm border-b-2 border-transparent hover:border-white pb-1" data-testid="link-leaderboard">
            VIEW LEADERBOARD
          </span>
        </Link>
      </div>
    </div>
  );
}
