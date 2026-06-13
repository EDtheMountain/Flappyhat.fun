import { useLocation, Link } from "wouter";
import wifhatImg from "@assets/Wifhat_1781355793327.png";

const GOLD = "#ffd700";
const PANEL_BG = "rgba(8,12,28,0.88)";
const PANEL_BORDER = "1.5px solid rgba(255,215,0,0.35)";
const FONT = '"Courier New", monospace';

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div style={{
      minHeight: "100dvh", width: "100%",
      background: "linear-gradient(180deg, #0a0a18 0%, #0d1220 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: FONT, padding: "24px",
    }}>
      {/* Announcement bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "28px",
        background: "linear-gradient(90deg, #0a0a18, #111128, #0a0a18)",
        borderBottom: "1px solid rgba(255,215,0,0.35)",
        display: "flex", alignItems: "center",
        overflow: "hidden", zIndex: 200,
      }}>
        <div style={{
          color: GOLD, fontSize: "11px", fontFamily: FONT, fontWeight: "bold",
          whiteSpace: "nowrap",
          animation: "marquee 28s linear infinite",
        }}>
          &nbsp;&nbsp;&nbsp;$BTH — FLAPPY WIF HAT — COLLECT COINS — BEAT THE LEADERBOARD — $BTH — FLAPPY WIF HAT — COLLECT COINS — BEAT THE LEADERBOARD — $BTH — FLAPPY WIF HAT &nbsp;&nbsp;&nbsp;
        </div>
      </div>

      <div style={{ maxWidth: "420px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", marginTop: "28px" }}>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(32px, 8vw, 54px)", fontWeight: "bold",
            color: GOLD, fontFamily: FONT, lineHeight: 1.1,
            textShadow: `0 0 20px rgba(255,215,0,0.6), 0 4px 0 rgba(0,0,0,0.8)`,
            margin: 0,
          }}>
            FLAPPY<br />WIF HAT
          </h1>
          <p style={{ color: "rgba(255,215,0,0.55)", fontSize: "13px", marginTop: "8px", fontFamily: FONT }}>
            Get rich or rekt trying
          </p>
        </div>

        {/* Bouncing hat */}
        <div style={{ animation: "hatBounce 2s ease-in-out infinite" }}>
          <img
            src={wifhatImg}
            alt="Wif Hat"
            style={{ width: "96px", height: "96px", objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.5))" }}
          />
        </div>

        {/* Play button */}
        <div style={{ width: "100%", background: PANEL_BG, border: PANEL_BORDER, borderRadius: "12px", padding: "24px", boxShadow: "0 0 16px rgba(255,215,0,0.15)" }}>
          <button
            onClick={() => setLocation("/game")}
            style={{
              width: "100%", padding: "18px",
              background: "rgba(255,215,0,0.18)",
              border: "1.5px solid rgba(255,215,0,0.55)",
              borderRadius: "8px",
              color: GOLD, fontFamily: FONT, fontWeight: "bold",
              fontSize: "clamp(16px, 3vw, 22px)", cursor: "pointer",
              letterSpacing: "0.05em",
              boxShadow: "0 0 12px rgba(255,215,0,0.2)",
            }}
          >
            PLAY NOW
          </button>
        </div>

        {/* Leaderboard link */}
        <Link href="/leaderboard">
          <span style={{
            color: "rgba(255,215,0,0.7)", fontFamily: FONT, fontSize: "13px",
            cursor: "pointer", borderBottom: "1px solid rgba(255,215,0,0.3)",
            paddingBottom: "2px", letterSpacing: "0.05em",
          }}>
            VIEW LEADERBOARD
          </span>
        </Link>
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
        @keyframes cdShrink {
          from { transform: scale(1.6); opacity: 0.6; }
          to { transform: scale(1.0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
