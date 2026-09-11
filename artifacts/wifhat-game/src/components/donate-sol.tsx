import { useState } from "react";

const SOL_ADDR = "6jRyhGLZZUNE6vjBZosref2WyGfYH4kxvqeZKLx8paPQ";
const FONT = '"JetBrains Mono", "Courier New", monospace';

function SolanaLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 397.7 311.7" fill="currentColor">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
    </svg>
  );
}

export function DonateSolButton() {
  const [showDonate, setShowDonate] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SOL_ADDR).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      <button
        onClick={() => setShowDonate(v => !v)}
        style={{
          width: "100%", padding: "12px 14px",
          background: showDonate
            ? "linear-gradient(135deg, rgba(153,69,255,0.2), rgba(20,241,149,0.1))"
            : "rgba(255,255,255,0.04)",
          border: showDonate
            ? "1.5px solid rgba(153,69,255,0.55)"
            : "1.5px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          color: showDonate ? "#b97eff" : "rgba(255,255,255,0.45)",
          fontFamily: FONT, fontWeight: "bold",
          fontSize: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          letterSpacing: "0.05em",
          transition: "all 0.2s",
        }}
      >
        <SolanaLogo />
        DONATE SOLANA
      </button>

      {showDonate && (
        <div style={{
          background: "linear-gradient(135deg, rgba(153,69,255,0.08), rgba(20,241,149,0.04))",
          border: "1.5px solid rgba(153,69,255,0.3)",
          borderRadius: "10px",
          padding: "14px",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", letterSpacing: "0.1em" }}>
            SOLANA WALLET ADDRESS
          </div>
          <div style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(153,69,255,0.25)",
            borderRadius: "6px",
            padding: "10px 12px",
            color: "#d4b8ff",
            fontFamily: FONT,
            fontSize: "11px",
            wordBreak: "break-all",
            lineHeight: 1.6,
            letterSpacing: "0.02em",
          }}>
            {SOL_ADDR}
          </div>
          <button
            onClick={handleCopy}
            style={{
              width: "100%", padding: "11px",
              background: copied
                ? "linear-gradient(135deg, rgba(20,241,149,0.25), rgba(20,200,120,0.15))"
                : "linear-gradient(135deg, rgba(153,69,255,0.25), rgba(100,40,200,0.15))",
              border: copied
                ? "1.5px solid rgba(20,241,149,0.6)"
                : "1.5px solid rgba(153,69,255,0.5)",
              borderRadius: "7px",
              color: copied ? "#14f195" : "#b97eff",
              fontFamily: FONT, fontWeight: "bold",
              fontSize: "13px", cursor: "pointer", letterSpacing: "0.06em",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ COPIED!" : "📋 COPY ADDRESS"}
          </button>
        </div>
      )}
    </div>
  );
}
