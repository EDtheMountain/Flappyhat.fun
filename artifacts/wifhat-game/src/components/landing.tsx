import { useEffect, useRef, useState } from "react";
import "./landing.css";

export const CONTRACT_ADDRESS = "ESBCnCXtEZDmX8QnHU6qMZXd9mvjSAZVoYaLKKADBAGS";
const BAGS_URL = `https://bags.fm/${CONTRACT_ADDRESS}`;
const DEXSCREENER_URL = "https://dexscreener.com/solana/3hp2gg5stanta2ztzrrca63btyseyptaskglcyqxwfbu";
const X_URL = "https://x.com/BuythehatOnBags";
const HAT_SITE_URL = "https://thewifhat.xyz/";

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some in-app browsers (X, Telegram) reject the Clipboard API; fall through
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("Copy failed");
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function ContractAddress({ large = false }: { large?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await copyText(CONTRACT_ADDRESS);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard unavailable: select the address so it can be copied by hand
      setCopied(false);
      const sel = window.getSelection();
      if (sel && valueRef.current) {
        const range = document.createRange();
        range.selectNodeContents(valueRef.current);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`fh-ca${large ? " fh-ca--lg" : ""}${copied ? " is-copied" : ""}`}
      aria-label={`Copy $BTH contract address ${CONTRACT_ADDRESS}`}
    >
      <span className="fh-ca-label">$BTH contract · Solana</span>
      <span className="fh-ca-row">
        <span className="fh-ca-value" ref={valueRef}>{CONTRACT_ADDRESS}</span>
        <span className="fh-ca-action" aria-live="polite">
          {copied ? "✓ Copied" : <><CopyIcon /> Copy</>}
        </span>
      </span>
    </button>
  );
}

type StoryEvent = {
  date: string;
  title: string;
  body: React.ReactNode;
  source: string;
  variant?: "key" | "future";
};

const STORY: StoryEvent[] = [
  {
    date: "Nov 2018",
    title: "The origin",
    body: <>In South Korea, a Shiba Inu named <strong>Achi</strong> is photographed in a pink knitted beanie. The picture turns into one of the internet's most shared dog memes.</>,
    source: "https://www.bitrue.com/blog/untold-story-behind-dogwifhat-wif",
  },
  {
    date: "Mar 2024",
    title: "WIF mania",
    body: <>dogwifhat ($WIF) runs to a <strong>$4.58B market cap</strong> on Solana, and a dog in a hat becomes a crypto icon.</>,
    source: "https://x.com/notjpqt/status/1767954793081774589",
  },
  {
    date: "Mar 2024",
    title: "The NFT sale",
    body: <>The original photo sells as an NFT for <strong>$4.27M in ETH</strong>. The image had a price. The hat was still out there.</>,
    source: "https://x.com/ComicsandCrypto/status/1770224085412577575",
  },
  {
    date: "Aug 2025",
    title: "The auction",
    body: <>The physical hat, the actual knitted beanie from the photo, goes up for auction. The bidding turns into a public war.</>,
    source: "https://x.com/finnbags/status/1953299785957380430",
  },
  {
    date: "Aug 2025",
    title: "Finn's victory",
    body: <>Finn of Bags wins the hat, with the bid backed by the $BTH community. <strong>Buy The Hat</strong> did exactly that.</>,
    source: "https://finance.yahoo.com/news/dogwifhat-knitted-hat-sells-800-110003887.html",
    variant: "key",
  },
  {
    date: "Next",
    title: "What's next",
    body: <>WIF hat mania, metadata updates, and whatever the holders build. The hat stays on and the story keeps going.</>,
    source: "https://x.com/finnbags/status/1965205590034333953",
    variant: "future",
  },
];

/** Tracks how far the reader has scrolled through the timeline, so the
 *  knit thread can "stitch" down the page and light each milestone. */
function useThread(timelineRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [progress, setProgress] = useState(0);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      setLit(count);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const anchor = window.innerHeight * 0.62;
      const rect = el.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (anchor - rect.top) / rect.height)));
      const nodes = el.querySelectorAll<HTMLElement>(".fh-event");
      let n = 0;
      nodes.forEach(node => {
        if (node.getBoundingClientRect().top + 28 <= anchor) n++;
      });
      setLit(n);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [timelineRef, count]);

  return { progress, lit };
}

export function StorySection() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { progress, lit } = useThread(timelineRef, STORY.length);

  return (
    <section id="story" className="fh-section" aria-labelledby="story-title">
      <div className="fh-wrap fh-story-grid">
        <header className="fh-head">
          <p className="fh-eyebrow">History in the making</p>
          <h2 id="story-title">The $800K story</h2>
          <p className="fh-lede">
            How a knitted beanie from South Korea became the most expensive hat in crypto, and how the $BTH community bought it.
          </p>
        </header>

        <div className="fh-timeline" ref={timelineRef}>
          <div className="fh-spine" aria-hidden="true">
            <div className="fh-spine-fill" style={{ height: `${progress * 100}%` }} />
          </div>

          <ol className="fh-events">
            {STORY.map((ev, i) => (
              <li
                key={ev.title}
                className={[
                  "fh-event",
                  i < lit ? "is-lit" : "",
                  ev.variant ? `fh-event--${ev.variant}` : "",
                ].join(" ")}
              >
                <span className="fh-node" aria-hidden="true" />
                <article className="fh-card">
                  <div className="fh-card-meta">
                    <time>{ev.date}</time>
                    <a className="fh-source" href={ev.source} target="_blank" rel="noopener noreferrer">
                      Source ↗
                    </a>
                  </div>
                  <h3>{ev.title}</h3>
                  <p>{ev.body}</p>
                  {ev.variant === "key" && (
                    <dl className="fh-receipt">
                      <dt>Winning bid</dt>
                      <dd className="fh-big">6.8 BTC</dd>
                      <dt>Approx. USD</dt>
                      <dd>$800,000</dd>
                      <dt>Backed by</dt>
                      <dd>$BTH holders</dd>
                    </dl>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const PILLARS = [
  {
    tag: "Buybacks · burns",
    title: "Royalties fuel the token",
    body: "Bags App royalties continuously buy back $BTH, burn supply, and pay for DexScreener boost campaigns.",
  },
  {
    tag: "Liquidity",
    title: "Locked liquidity",
    body: "A treasury-controlled DLMM position on Meteora keeps liquidity deep, cuts slippage, and gives holders a rug-proof foundation.",
  },
  {
    tag: "Rewards",
    title: "Airdrops for the active",
    body: "Raiders, meme creators, and holders of aligned projects get rewarded, which grows the holder count and keeps people around.",
  },
  {
    tag: "Treasury",
    title: "Strategic OTC",
    body: "Private treasury OTC trades let large buyers and sellers resize their position without moving the chart.",
  },
];

const FLYWHEEL = [
  "Bags App royalties",
  "Buy back $BTH",
  "Burn supply, fund airdrops & boosts",
  "Price support, new holders, visibility",
  "More royalties generated",
];

export function VisionSection() {
  return (
    <section id="vision" className="fh-section" aria-labelledby="vision-title">
      <div className="fh-wrap">
        <header className="fh-head">
          <p className="fh-eyebrow">The vision</p>
          <h2 id="vision-title">Proof of commitment</h2>
          <p className="fh-lede">
            The $800K hat showed the community would show up. Now $BTH is building a self-sustaining, community-owned ecosystem on the Bags App model.
          </p>
        </header>

        <div className="fh-pillars">
          {PILLARS.map(p => (
            <div className="fh-pillar" key={p.title}>
              <span className="fh-pillar-tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>

        <div className="fh-flywheel">
          <h3 className="fh-subhead">The $BTH flywheel</h3>
          <p>A growth loop where platform revenue feeds token value and community rewards, then comes back around.</p>
          <ol className="fh-loop">
            {FLYWHEEL.map(step => <li key={step}>{step}</li>)}
            <li className="fh-loop-repeat">Repeat</li>
          </ol>
        </div>

        <blockquote className="fh-quote">
          <p>The chart only knows green. The hat stays on.</p>
          <footer>— the $BTH team</footer>
        </blockquote>
      </div>
    </section>
  );
}

const SPECS = [
  { label: "Total supply", value: "1,000,000,000" },
  { label: "Locked by Finnbags", value: "20%" },
  { label: "Chain", value: "Solana" },
  { label: "Launched on", value: "Bags.fm" },
];

export function TokenSection() {
  return (
    <section id="token" className="fh-section" aria-labelledby="token-title">
      <div className="fh-wrap">
        <header className="fh-head">
          <p className="fh-eyebrow">Tokenomics</p>
          <h2 id="token-title">$BTH on Solana</h2>
          <p className="fh-lede">Built for the community. Powered by Bags.fm.</p>
        </header>

        <dl className="fh-specs">
          {SPECS.map(s => (
            <div className="fh-spec" key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>

        <ContractAddress large />

        <div className="fh-actions">
          <a className="fh-btn fh-btn--primary" href={BAGS_URL} target="_blank" rel="noopener noreferrer">Buy $BTH on Bags ↗</a>
          <a className="fh-btn" href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer">DexScreener ↗</a>
          <a className="fh-btn" href={X_URL} target="_blank" rel="noopener noreferrer">Follow on X ↗</a>
        </div>

        <p className="fh-note">
          Live holder, buyback, and burn dashboards are on <a href={HAT_SITE_URL} target="_blank" rel="noopener noreferrer">thewifhat.xyz</a>. Always check the contract address before you buy.
        </p>
      </div>
    </section>
  );
}
