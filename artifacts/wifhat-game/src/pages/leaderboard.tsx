import { Link } from "wouter";
import { useGetLeaderboard, useGetMe, getGetMeQueryKey, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Leaderboard() {
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey() } });
  const { data: leaderboard, isLoading } = useGetLeaderboard({ limit: 50 }, { query: { queryKey: getGetLeaderboardQueryKey({ limit: 50 }) } });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-6 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="hover:bg-primary/20 text-primary">
            <Link href={user ? "/game" : "/"}>
              <ChevronLeft className="w-8 h-8" />
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl text-primary drop-shadow-[0_2px_0_hsl(var(--primary-foreground))]">
            GLOBAL RANKS
          </h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* User Stats if logged in */}
        {user && (
          <div className="bg-card border-2 border-secondary p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-white pixel-border rounded-none">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-secondary text-secondary-foreground rounded-none text-xs">
                  {user.displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm text-muted-foreground">YOUR BEST</div>
                <div className="text-xl text-white">{user.highScore}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">TOTAL BTH</div>
              <div className="text-xl text-accent">{user.bthCoins}</div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-black/50 border-4 border-primary p-4 shadow-[8px_8px_0_hsl(var(--primary))]">
          <div className="grid grid-cols-[3rem_1fr_4rem_4rem] md:grid-cols-[4rem_1fr_6rem_6rem] gap-2 md:gap-4 mb-4 text-xs md:text-sm text-muted-foreground border-b border-border pb-2">
            <div className="text-center">RANK</div>
            <div>PLAYER</div>
            <div className="text-right">SCORE</div>
            <div className="text-right">BTH</div>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 h-14">
                  <Skeleton className="h-full w-full bg-zinc-800" />
                </div>
              ))
            ) : leaderboard?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scores yet. Be the first!
              </div>
            ) : (
              leaderboard?.map((entry) => (
                <div 
                  key={entry.userId}
                  className={`grid grid-cols-[3rem_1fr_4rem_4rem] md:grid-cols-[4rem_1fr_6rem_6rem] gap-2 md:gap-4 items-center p-2 border border-transparent transition-colors ${
                    user?.id === entry.userId ? "bg-primary/20 border-primary" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className={`text-center font-bold text-lg md:text-xl ${
                    entry.rank === 1 ? "text-accent drop-shadow-[0_2px_0_#000]" : 
                    entry.rank === 2 ? "text-zinc-300" : 
                    entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                  }`}>
                    #{entry.rank}
                  </div>
                  
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-white rounded-none shrink-0 hidden md:block">
                      <AvatarImage src={entry.avatarUrl || undefined} />
                      <AvatarFallback className="bg-zinc-800 rounded-none text-[10px]">
                        {entry.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate text-xs md:text-sm text-white">
                      {entry.displayName}
                      {entry.isGuest && <span className="ml-2 text-[8px] text-muted-foreground border border-muted-foreground px-1 py-0.5">GUEST</span>}
                    </div>
                  </div>
                  
                  <div className="text-right text-sm md:text-base font-bold text-white">
                    {entry.highScore}
                  </div>
                  
                  <div className="text-right text-xs md:text-sm text-accent">
                    {entry.bthCoins}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
