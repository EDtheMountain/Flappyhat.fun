import { Link } from "wouter";
import { useGetLeaderboard, useGetMe, getGetMeQueryKey, getGetLeaderboardQueryKey } from "@workspace/api-client-react";

const GOLD = "#ffd700";
const FONT = '"Courier New", monospace';

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().split("").map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join("");
}

function Tab({ active, label, href }: { active: boolean; label: string; href: string }) {
  return (
    <Link href={href}>
      <span style={{
        padding: "8px 16px", fontFamily: FONT, fontSize: "12px", fontWeight: "bold",
        cursor: "pointer", letterSpacing: "0.06em",
        color: active ? GOLD : "rgba(255,215,0,0.4)",
        borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
        transition: "all 0.2s",
      }}>
        {label}
      </span>
    </Link>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: "20px" }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: "20px" }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: "20px" }}>🥉</span>;
  return (
    <span style={{
      color: "rgba(255,215,0,0.45)", fontFamily: FONT,
      fontSize: "13px", fontWeight: "bold",
    }}>
      #{rank}
    </span>
  );
}

function Avatar({ src, name }: { src: string | null | undefined; name: string }) {
  return src ? (
    <img src={src} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,215,0,0.35)", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "rgba(255,215,0,0.1)",
      border: "1px solid rgba(255,215,0,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: GOLD, fontSize: "11px", fontWeight: "bold", flexShrink: 0,
    }}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "3rem 1fr 6rem",
      gap: "12px", padding: "12px 8px",
      borderBottom: "1px solid rgba(255,215,0,0.06)",
    }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          height: "20px", borderRadius: "4px",
          background: "rgba(255,255,255,0.05)",
          animation: "shimmer 1.4s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey(), retry: false } });
  const { data: leaderboard, isLoading } = useGetLeaderboard(
    { limit: 50 },
    {
      query: {
        queryKey: getGetLeaderboardQueryKey({ limit: 50 }),
        refetchOnMount: "always",
        refetchInterval: 8000,
        staleTime: 0,
      },
    }
  );

  return (
    <div style={{
      minHeight: "100dvh", width: "100%",
      background: "linear-gradient(180deg, #050510 0%, #0a0d1e 60%, #060914 100%)",
      fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 16px 48px",
    }}>
      {/* Marquee */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "28px",
        background: "linear-gradient(90deg, #050510, #0d0f22, #050510)",
        borderBottom: "1px solid rgba(255,215,0,0.3)",
        display: "flex", alignItems: "center",
        overflow: "hidden", zIndex: 200,
      }}>
        <div style={{
          color: GOLD, fontSize: "11px", fontFamily: FONT, fontWeight: "bold",
          whiteSpace: "nowrap",
          animation: "marquee 38s linear infinite",
        }}>
          &nbsp;&nbsp;&nbsp;$BTH — FLAPPY WIF HAT — BEAT THE LEADERBOARD — CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS — $BTH — FLAPPY WIF HAT — BEAT THE LEADERBOARD — CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS&nbsp;&nbsp;&nbsp;
        </div>
      </div>

      <div style={{ maxWidth: "640px", width: "100%", marginTop: "52px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href={user ? "/game" : "/"}>
            <span style={{
              color: "rgba(255,215,0,0.55)", fontSize: "20px", cursor: "pointer",
              padding: "4px 8px",
            }}>‹</span>
          </Link>
          <h1 style={{
            color: GOLD, fontFamily: FONT,
            fontSize: "clamp(18px, 5vw, 26px)",
            fontWeight: "bold", letterSpacing: "0.08em",
            textShadow: "0 0 16px rgba(255,215,0,0.4)",
            margin: 0,
          }}>
            🏆 GLOBAL LEADERBOARD
          </h1>
          <div style={{ width: 32 }} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,215,0,0.12)" }}>
          <Tab active={true} label="🌍 GLOBAL" href="/leaderboard" />
          <Tab active={false} label="🚩 COUNTRIES" href="/leaderboard/country" />
        </div>

        {/* My stats card (if logged in) */}
        {user && (
          <div style={{
            background: "rgba(255,215,0,0.06)",
            border: "1.5px solid rgba(255,215,0,0.35)",
            borderRadius: "10px", padding: "14px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Avatar src={user.avatarUrl} name={user.displayName} />
              <div>
                <div style={{ color: "#fff", fontWeight: "bold", fontSize: "13px" }}>{user.displayName}</div>
                <div style={{ color: "rgba(255,215,0,0.45)", fontSize: "11px" }}>{user.isGuest ? "GUEST" : "X USER"}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(255,215,0,0.45)", fontSize: "10px", letterSpacing: "0.06em" }}>BEST SCORE</div>
              <div style={{ color: "#fff", fontWeight: "bold", fontSize: "20px" }}>{user.highScore}</div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        <div style={{
          background: "rgba(5,5,18,0.85)",
          border: "1.5px solid rgba(255,215,0,0.25)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 0 32px rgba(255,215,0,0.06)",
        }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "3rem 1fr 6rem",
            gap: "12px", padding: "10px 16px",
            borderBottom: "1px solid rgba(255,215,0,0.15)",
            background: "rgba(255,215,0,0.04)",
          }}>
            <div style={{ color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em", textAlign: "center" }}>RANK</div>
            <div style={{ color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em" }}>PLAYER</div>
            <div style={{ color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em", textAlign: "right" }}>SCORE</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
          ) : !leaderboard?.length ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "rgba(255,215,0,0.35)", fontSize: "13px" }}>
              No scores yet. Be the first! 🎮
            </div>
          ) : (
            leaderboard.map((entry) => {
              const isMe = user?.id === entry.userId;
              const flag = countryFlag(entry.country);
              return (
                <div
                  key={entry.userId}
                  style={{
                    display: "grid", gridTemplateColumns: "3rem 1fr 6rem",
                    gap: "12px", padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,215,0,0.06)",
                    background: isMe ? "rgba(255,215,0,0.08)" : "transparent",
                    borderLeft: isMe ? `2px solid ${GOLD}` : "2px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Rank */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RankBadge rank={entry.rank} />
                  </div>

                  {/* Player */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                    <Avatar src={entry.avatarUrl} name={entry.displayName} />
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {flag && <span style={{ fontSize: "16px", lineHeight: 1 }}>{flag}</span>}
                        <span style={{
                          color: isMe ? GOLD : "#e0e0e0",
                          fontWeight: isMe ? "bold" : "normal",
                          fontSize: "13px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.displayName}
                        </span>
                      </div>
                      {entry.isGuest && (
                        <span style={{
                          fontSize: "9px", color: "rgba(255,255,255,0.28)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          padding: "1px 4px", borderRadius: "3px", letterSpacing: "0.06em",
                        }}>GUEST</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{
                    textAlign: "right", fontWeight: "bold",
                    color: entry.rank <= 3 ? GOLD : "#e0e0e0",
                    fontSize: "14px",
                    display: "flex", alignItems: "center", justifyContent: "flex-end",
                  }}>
                    {entry.highScore.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Play button */}
        <div style={{ textAlign: "center" }}>
          <Link href={user ? "/game" : "/"}>
            <span style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,185,0,0.1))",
              border: "1.5px solid rgba(255,215,0,0.45)",
              borderRadius: "8px",
              color: GOLD, fontFamily: FONT, fontWeight: "bold",
              fontSize: "14px", cursor: "pointer", letterSpacing: "0.07em",
              boxShadow: "0 0 12px rgba(255,215,0,0.12)",
            }}>
              {user ? "▶ PLAY NOW" : "⬅ BACK"}
            </span>
          </Link>
        </div>

      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
