import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import wifhatImg from "@assets/Wifhat_1781355793327.png";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { unlockAudio } from "@/lib/sounds";
import { DonateSolButton } from "@/components/donate-sol";

const GOLD = "#ffd700";
const PANEL_BG = "rgba(8,12,28,0.92)";
const PANEL_BORDER = "1.5px solid rgba(255,215,0,0.35)";
const FONT = '"Courier New", monospace';
const MARQUEE_TEXT =
  "\u00a0\u00a0\u00a0$BTH \u2014 FLAPPY WIF HAT \u2014 DODGE THE PIPES \u2014 BEAT THE LEADERBOARD \u2014 CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS \u2014 $BTH \u2014 FLAPPY WIF HAT \u2014 DODGE THE PIPES \u2014 BEAT THE LEADERBOARD \u2014 CA: ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS\u00a0\u00a0\u00a0";

function XLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 1200 1227" fill="currentColor">
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z" />
    </svg>
  );
}


export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { data: me, isLoading: meLoading } = useGetMe({
    query: { enabled: true, queryKey: getGetMeQueryKey(), retry: false },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      setError("Twitter sign-in failed. Please try again or use guest login.");
    }
  }, []);

  async function handleTwitterLogin() {
    setTwitterLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/twitter");
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Twitter sign-in is not available right now. Use guest login.");
        setTwitterLoading(false);
      }
    } catch {
      setError("Could not reach the server. Try again.");
      setTwitterLoading(false);
    }
  }

  async function handleGuestPlay(e: React.FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) { setError("Enter a username to play as guest."); return; }
    setGuestLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((body.error as string | undefined) ?? "Login failed.");
        return;
      }
      // Set user data directly so game.tsx sees it immediately (no stale-error window)
      queryClient.setQueryData(getGetMeQueryKey(), body);
      unlockAudio();
      setLocation("/game");
    } catch {
      setError("Server error. Try again.");
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } finally {
      setLogoutLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", width: "100%",
      background: "linear-gradient(180deg, #050510 0%, #0a0d1e 60%, #060914 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: FONT, padding: "24px",
    }}>
      {/* Marquee ticker */}
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
          {MARQUEE_TEXT}
        </div>
      </div>

      <div style={{ maxWidth: "400px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", marginTop: "32px" }}>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(30px, 8vw, 50px)", fontWeight: "bold",
            color: GOLD, fontFamily: FONT, lineHeight: 1.1,
            textShadow: `0 0 24px rgba(255,215,0,0.55), 0 4px 0 rgba(0,0,0,0.8)`,
            margin: 0,
          }}>
            FLAPPY<br />WIF HAT
          </h1>
          <p style={{ color: "rgba(255,215,0,0.5)", fontSize: "13px", marginTop: "8px", fontFamily: FONT, letterSpacing: "0.04em" }}>
            Get rich or rekt trying
          </p>
        </div>

        {/* Bouncing hat */}
        <div style={{ animation: "hatBounce 2s ease-in-out infinite" }}>
          <img
            src={wifhatImg}
            alt="Wif Hat"
            style={{ width: "88px", height: "88px", objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.5))" }}
          />
        </div>

        {/* Auth panel */}
        <div style={{ width: "100%", background: PANEL_BG, border: PANEL_BORDER, borderRadius: "14px", padding: "24px 20px", boxShadow: "0 0 24px rgba(255,215,0,0.08)" }}>

          {meLoading ? (
            <div style={{ textAlign: "center", color: "rgba(255,215,0,0.4)", fontSize: "13px", padding: "16px 0" }}>
              Loading…
            </div>
          ) : me ? (
            /* ── Already logged in ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                {me.avatarUrl && (
                  <img src={me.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${GOLD}` }} />
                )}
                <div>
                  <div style={{ color: GOLD, fontWeight: "bold", fontSize: "14px" }}>{me.displayName}</div>
                  <div style={{ color: "rgba(255,215,0,0.45)", fontSize: "11px" }}>
                    {me.isGuest ? "GUEST" : "X USER"} · BEST {me.highScore}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { unlockAudio(); setLocation("/game"); }}
                style={{
                  width: "100%", padding: "16px",
                  background: "linear-gradient(135deg, rgba(255,215,0,0.22), rgba(255,185,0,0.14))",
                  border: "1.5px solid rgba(255,215,0,0.6)",
                  borderRadius: "8px",
                  color: GOLD, fontFamily: FONT, fontWeight: "bold",
                  fontSize: "18px", cursor: "pointer", letterSpacing: "0.08em",
                  boxShadow: "0 0 16px rgba(255,215,0,0.18)",
                }}
              >
                ▶ PLAY NOW
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                style={{
                  width: "100%", padding: "10px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "6px",
                  color: "rgba(255,255,255,0.35)", fontFamily: FONT,
                  fontSize: "11px", cursor: "pointer", letterSpacing: "0.06em",
                }}
              >
                {logoutLoading ? "SIGNING OUT…" : "SIGN OUT"}
              </button>

              <DonateSolButton />
            </div>
          ) : (
            /* ── Not logged in ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Twitter / X sign-in */}
              <button
                onClick={handleTwitterLogin}
                disabled={twitterLoading}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "#000",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "#fff", fontFamily: FONT, fontWeight: "bold",
                  fontSize: "15px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  letterSpacing: "0.04em",
                  opacity: twitterLoading ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <XLogo />
                {twitterLoading ? "REDIRECTING…" : "SIGN IN WITH X"}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,215,0,0.18)" }} />
                <span style={{ color: "rgba(255,215,0,0.35)", fontSize: "11px", letterSpacing: "0.1em" }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,215,0,0.18)" }} />
              </div>

              {/* Guest login */}
              <form onSubmit={handleGuestPlay} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Enter username…"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  maxLength={20}
                  style={{
                    width: "100%", padding: "13px 14px",
                    background: "rgba(255,215,0,0.06)",
                    border: "1.5px solid rgba(255,215,0,0.25)",
                    borderRadius: "8px",
                    color: "#fff", fontFamily: FONT, fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={guestLoading}
                  style={{
                    width: "100%", padding: "14px",
                    background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,185,0,0.12))",
                    border: "1.5px solid rgba(255,215,0,0.5)",
                    borderRadius: "8px",
                    color: GOLD, fontFamily: FONT, fontWeight: "bold",
                    fontSize: "15px", cursor: "pointer", letterSpacing: "0.06em",
                    opacity: guestLoading ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {guestLoading ? "JOINING…" : "PLAY AS GUEST"}
                </button>
              </form>

              {/* Donate Solana */}
              <DonateSolButton />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: "14px", padding: "10px 12px",
              background: "rgba(255,60,60,0.12)",
              border: "1px solid rgba(255,60,60,0.35)",
              borderRadius: "6px",
              color: "#ff7070", fontSize: "12px", fontFamily: FONT,
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Leaderboard links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          <Link href="/leaderboard">
            <span style={{
              color: "rgba(255,215,0,0.55)", fontFamily: FONT, fontSize: "12px",
              cursor: "pointer", borderBottom: "1px solid rgba(255,215,0,0.25)",
              paddingBottom: "2px", letterSpacing: "0.07em",
            }}>
              🏆 VIEW GLOBAL LEADERBOARD
            </span>
          </Link>
          <Link href="/leaderboard/country">
            <span style={{
              color: "rgba(255,215,0,0.55)", fontFamily: FONT, fontSize: "12px",
              cursor: "pointer", borderBottom: "1px solid rgba(255,215,0,0.25)",
              paddingBottom: "2px", letterSpacing: "0.07em",
            }}>
              🌐 VIEW COUNTRY LEADERBOARD
            </span>
          </Link>
        </div>

      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes hatBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        input::placeholder { color: rgba(255,215,0,0.3); }
        input:focus { border-color: rgba(255,215,0,0.55) !important; }
      `}</style>
    </div>
  );
}
