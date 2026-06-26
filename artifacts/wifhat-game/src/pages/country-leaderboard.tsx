import { Link } from "wouter";
import { useGetCountryLeaderboard, useGetMe, getGetMeQueryKey, getGetCountryLeaderboardQueryKey } from "@workspace/api-client-react";

const GOLD = "#ffd700";
const FONT = '"Courier New", monospace';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: "22px" }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: "22px" }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: "22px" }}>🥉</span>;
  return (
    <span style={{
      color: "rgba(255,215,0,0.45)", fontFamily: FONT,
      fontSize: "13px", fontWeight: "bold",
    }}>
      #{rank}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 16px",
      borderBottom: "1px solid rgba(255,215,0,0.06)",
    }}>
      <div style={{ width: "40px", flexShrink: 0 }}>
        <div style={{ height: "20px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", animation: "shimmer 1.4s ease-in-out infinite" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: "20px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", animation: "shimmer 1.4s ease-in-out infinite" }} />
      </div>
      <div style={{ width: "80px", flexShrink: 0 }}>
        <div style={{ height: "20px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", animation: "shimmer 1.4s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function CountryBadge({ code }: { code: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: "32px", height: "20px",
      borderRadius: "4px",
      background: "linear-gradient(135deg, #ff4444, #ff8800)",
      color: "#fff", fontSize: "10px", fontWeight: "bold",
      fontFamily: FONT, letterSpacing: "0.05em",
      padding: "0 6px",
    }}>
      {code.toUpperCase()}
    </span>
  );
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

export default function CountryLeaderboard() {
  const { data: user } = useGetMe({ query: { enabled: true, queryKey: getGetMeQueryKey(), retry: false } });
  const { data: countries, isLoading } = useGetCountryLeaderboard(
    {
      query: {
        queryKey: getGetCountryLeaderboardQueryKey(),
        refetchOnMount: "always",
        refetchInterval: 8000,
        staleTime: 0,
      },
    }
  );

  const userCountry = user?.country?.toUpperCase() ?? null;

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
          &nbsp;&nbsp;&nbsp;$BTH — FLAPPY WIF HAT — DODGE THE PIPES — BEAT THE LEADERBOARD — CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS — $BTH — FLAPPY WIF HAT — DODGE THE PIPES — BEAT THE LEADERBOARD — CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS&nbsp;&nbsp;&nbsp;
        </div>
      </div>

      <div style={{ maxWidth: "640px", width: "100%", marginTop: "52px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href={user ? "/game" : "/"}>
            <span style={{ color: "rgba(255,215,0,0.55)", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>‹</span>
          </Link>
          <h1 style={{
            color: GOLD, fontFamily: FONT,
            fontSize: "clamp(16px, 4vw, 24px)",
            fontWeight: "bold", letterSpacing: "0.08em",
            textShadow: "0 0 16px rgba(255,215,0,0.4)",
            margin: 0,
          }}>
            🌐 COUNTRY LEADERBOARD
          </h1>
          <div style={{ width: 32 }} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,215,0,0.12)" }}>
          <Tab active={false} label="🌍 GLOBAL" href="/leaderboard" />
          <Tab active={true} label="🚩 COUNTRIES" href="/leaderboard/country" />
        </div>

        {/* Description */}
        <div style={{
          textAlign: "center", color: "rgba(255,215,0,0.35)", fontSize: "11px",
          letterSpacing: "0.05em", lineHeight: 1.5,
        }}>
          Countries ranked by total score across all runs.
          <br />
          Every score counts — not just your best!
        </div>

        {/* Country list */}
        <div style={{
          background: "rgba(5,5,18,0.85)",
          border: "1.5px solid rgba(255,215,0,0.25)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 0 32px rgba(255,215,0,0.06)",
        }}>
          {/* Column headers */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: "12px", padding: "10px 16px",
            borderBottom: "1px solid rgba(255,215,0,0.15)",
            background: "rgba(255,215,0,0.04)",
          }}>
            <div style={{ width: "40px", textAlign: "center", color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em" }}>RANK</div>
            <div style={{ flex: 1, color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em" }}>COUNTRY</div>
            <div style={{ width: "80px", textAlign: "right", color: "rgba(255,215,0,0.4)", fontSize: "10px", letterSpacing: "0.08em" }}>TOTAL</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
          ) : !countries?.length ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "rgba(255,215,0,0.35)", fontSize: "13px" }}>
              No countries yet. Play now and put your flag on the map! 🎮
            </div>
          ) : (
            countries.map((entry) => {
              const isMyCountry = userCountry === entry.country;
              return (
                <div
                  key={entry.country}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: "12px", padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,215,0,0.06)",
                    background: isMyCountry ? "rgba(255,215,0,0.08)" : "transparent",
                    borderLeft: isMyCountry ? `2px solid ${GOLD}` : "2px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Rank */}
                  <div style={{ width: "40px", textAlign: "center", flexShrink: 0 }}>
                    <RankBadge rank={entry.rank} />
                  </div>

                  {/* Country */}
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CountryBadge code={entry.country} />
                      <span style={{
                        color: isMyCountry ? GOLD : "#e0e0e0",
                        fontWeight: isMyCountry ? "bold" : "normal",
                        fontSize: "13px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.countryName}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", marginTop: "2px", marginLeft: "40px" }}>
                      Top: {entry.topPlayer}
                    </div>
                  </div>

                  {/* Total Score */}
                  <div style={{
                    width: "80px", textAlign: "right", flexShrink: 0,
                    fontWeight: "bold",
                    color: entry.rank <= 3 ? GOLD : "#e0e0e0",
                    fontSize: "14px",
                  }}>
                    {entry.totalScore.toLocaleString()}
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
