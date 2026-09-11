// Procedural parallax city skyline for the game background.
// Each layer is rendered once into an offscreen tile at device resolution and
// then blitted at whole-device-pixel offsets every frame, so it stays sharp on
// any screen density (unlike a scaled bitmap).

type LayerSpec = {
  speed: number;              // parallax factor relative to pipe scroll
  seed: number;
  minH: number; maxH: number; // building height as a fraction of the play area
  minW: number; maxW: number; // building width in grid units
  body: string;
  shade: string;
  win: string | null;
  lit: string;
  litChance: number;
  haze: number;               // fade building bases into the horizon haze (0..1)
  base: string | null;        // street strip along the bottom
  signs: boolean;             // rooftop $BTH billboards
  beacons: boolean;           // red antenna tips
};

const HORIZON = "#d4f7e6";

const LAYERS: LayerSpec[] = [
  {
    speed: 0.1, seed: 11, minH: 0.2, maxH: 0.46, minW: 6, maxW: 14,
    body: "#a4e6e4", shade: "#93dbdb", win: null, lit: "", litChance: 0,
    haze: 0.6, base: null, signs: false, beacons: false,
  },
  {
    speed: 0.24, seed: 23, minH: 0.13, maxH: 0.33, minW: 7, maxW: 14,
    body: "#4fb3c2", shade: "#43a1b1", win: "#6fcad4", lit: "#fff3b8", litChance: 0.07,
    haze: 0.28, base: null, signs: false, beacons: false,
  },
  {
    speed: 0.45, seed: 37, minH: 0.07, maxH: 0.2, minW: 8, maxW: 15,
    body: "#1f6c84", shade: "#185a6f", win: "#2c839b", lit: "#ffd700", litChance: 0.14,
    haze: 0, base: "#144d61", signs: true, beacons: true,
  },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = { x: number; w: number; h: number; roof: number; seed: number; sign: boolean };

type Layer = { canvas: HTMLCanvasElement; tileW: number; h: number; y: number; speed: number };

export type Skyline = {
  drawSky(ctx: CanvasRenderingContext2D): void;
  drawLayers(ctx: CanvasRenderingContext2D, offset: number): void;
};

export function createSkyline(GW: number, GH: number, floorY: number, dpr: number): Skyline {
  const u = Math.max(2, Math.round(GH / 210));        // pixel-grid unit (CSS px)
  const snap = (v: number) => Math.round(v / u) * u;
  const tileW = Math.ceil((Math.max(GW, 640) * 1.3) / u) * u;

  // ── Sky ────────────────────────────────────────────────────────────────
  const sky = document.createElement("canvas");
  sky.width = Math.round(GW * dpr);
  sky.height = Math.round(floorY * dpr);
  {
    const c = sky.getContext("2d")!;
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, "#38c1e6");
    g.addColorStop(0.5, "#5ddfec");
    g.addColorStop(0.82, "#9cefe9");
    g.addColorStop(1, HORIZON);
    c.fillStyle = g;
    c.fillRect(0, 0, GW, floorY);
    const sun = c.createRadialGradient(GW * 0.74, floorY * 0.7, 0, GW * 0.74, floorY * 0.7, GH * 0.42);
    sun.addColorStop(0, "rgba(255, 246, 205, 0.55)");
    sun.addColorStop(1, "rgba(255, 246, 205, 0)");
    c.fillStyle = sun;
    c.fillRect(0, 0, GW, floorY);
  }

  // ── Building layers ────────────────────────────────────────────────────
  const layers: Layer[] = LAYERS.map(spec => {
    const rnd = mulberry32(spec.seed);
    const maxBH = snap(spec.maxH * floorY);
    const h = maxBH + u * 12; // headroom for antennas and signs
    const baseY = h;

    const buildings: Building[] = [];
    let x = 0;
    while (x < tileW) {
      const w = (spec.minW + Math.floor(rnd() * (spec.maxW - spec.minW + 1))) * u;
      const bh = snap((spec.minH + Math.pow(rnd(), 1.2) * (spec.maxH - spec.minH)) * floorY);
      buildings.push({ x, w, h: bh, roof: Math.floor(rnd() * 5), seed: Math.floor(rnd() * 1e9), sign: false });
      x += Math.max(u * 3, w + (Math.floor(rnd() * 5) - 2) * u);
    }
    if (spec.signs) {
      // one or two billboards per tile, on wide flat-topped buildings
      const eligible = buildings.filter(b => b.w >= 12 * u && b.h < maxBH * 0.8);
      if (eligible[1]) eligible[1].sign = true;
      if (eligible.length > 5) eligible[Math.floor(eligible.length * 0.65)].sign = true;
    }
    // taller buildings behind shorter ones
    buildings.sort((a, b) => b.h - a.h);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(tileW * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext("2d")!;
    c.scale(dpr, dpr);

    for (const b of buildings) {
      drawBuilding(c, b, b.x, baseY, u, spec);
      if (b.x + b.w > tileW) drawBuilding(c, b, b.x - tileW, baseY, u, spec); // seamless wrap
    }

    if (spec.haze > 0) {
      c.globalCompositeOperation = "source-atop";
      const g = c.createLinearGradient(0, baseY - maxBH, 0, baseY);
      g.addColorStop(0, "rgba(212, 247, 230, 0)");
      g.addColorStop(1, hexA(HORIZON, spec.haze));
      c.fillStyle = g;
      c.fillRect(0, 0, tileW, h);
      c.globalCompositeOperation = "source-over";
    }

    if (spec.base) {
      c.fillStyle = spec.base;
      c.fillRect(0, baseY - u * 2, tileW, u * 2);
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(0, baseY - u * 2, tileW, Math.max(1, Math.round(u / 3)));
    }

    const y = Math.round((floorY - h) * dpr) / dpr;
    return { canvas, tileW, h, y, speed: spec.speed };
  });

  return {
    drawSky(ctx) {
      ctx.drawImage(sky, 0, 0, GW, floorY);
    },
    drawLayers(ctx, offset) {
      for (const L of layers) {
        let x = -((offset * L.speed) % L.tileW);
        x = Math.round(x * dpr) / dpr;
        for (; x < GW; x += L.tileW) ctx.drawImage(L.canvas, x, L.y, L.tileW, L.h);
      }
    },
  };
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function drawBuilding(c: CanvasRenderingContext2D, b: Building, x0: number, baseY: number, u: number, spec: LayerSpec) {
  const rnd = mulberry32(b.seed);
  const top = baseY - b.h;
  const cx = x0 + Math.round(b.w / 2 / u) * u;

  // Roof details (drawn first so the body overlaps their base)
  c.fillStyle = spec.body;
  if (!b.sign) {
    switch (b.roof) {
      case 1: { // stepped crown
        const iw = Math.max(2, Math.round((b.w * 0.6) / u)) * u;
        const ih = (2 + Math.floor(rnd() * 4)) * u;
        const ix = x0 + Math.round((b.w - iw) / 2 / u) * u;
        c.fillRect(ix, top - ih, iw, ih);
        c.fillStyle = spec.shade;
        c.fillRect(ix + iw - u, top - ih, u, ih);
        break;
      }
      case 2: { // antenna
        const ah = (5 + Math.floor(rnd() * 4)) * u;
        const aw = Math.max(1, Math.round(u / 2));
        const mx = cx - Math.round(aw / 2);
        c.fillRect(cx - u, top - u * 2, u * 2, u * 2); // equipment box
        c.fillRect(mx, top - ah, aw, ah);              // mast
        if (spec.beacons) {
          c.fillStyle = "#ff5d6c";
          c.fillRect(cx - Math.round(u / 2), top - ah - u, u, u);
        }
        break;
      }
      case 3: { // spire
        for (let i = 1; i <= 3; i++) {
          const sw = Math.max(u, b.w - i * Math.round(b.w / 4 / u) * u);
          c.fillRect(cx - Math.round(sw / 2 / u) * u, top - i * u * 2, sw, u * 2);
        }
        break;
      }
      case 4: { // rooftop water tank
        const tx = x0 + u * 2;
        c.fillRect(tx, top - u * 4, u * 3, u * 3);
        c.fillRect(tx, top - u, u, u);
        c.fillRect(tx + u * 2, top - u, u, u);
        break;
      }
      default: break;
    }
  }

  // Body + right-hand shade for depth
  c.fillStyle = spec.body;
  c.fillRect(x0, top, b.w, b.h);
  c.fillStyle = spec.shade;
  c.fillRect(x0 + b.w - u, top, u, b.h);
  c.fillRect(x0, top, b.w, u); // parapet

  // Windows
  if (spec.win) {
    const bands = rnd() < 0.3;
    if (bands) {
      for (let y = top + u * 3; y < baseY - u * 3; y += u * 3) {
        c.fillStyle = rnd() < spec.litChance * 1.5 ? spec.lit : spec.win;
        c.fillRect(x0 + u, y, b.w - u * 3, u);
      }
    } else {
      const cols = Math.floor((b.w - u * 3) / (u * 2));
      for (let y = top + u * 3; y < baseY - u * 3; y += u * 3) {
        for (let i = 0; i < cols; i++) {
          c.fillStyle = rnd() < spec.litChance ? spec.lit : spec.win;
          c.fillRect(x0 + u * 2 + i * u * 2, y, u, u * 2 - Math.max(1, Math.round(u / 3)));
        }
      }
    }
  }

  // Rooftop $BTH billboard
  if (b.sign) {
    const pw = u * 14;
    const ph = u * 5;
    const px = x0 + Math.round((b.w - pw) / 2 / u) * u;
    const py = top - ph - u * 2;
    const inset = Math.max(1, Math.round(u / 2));
    c.fillStyle = "#0e2438";
    c.fillRect(px + u * 2, py + ph, u, u * 2);
    c.fillRect(px + pw - u * 3, py + ph, u, u * 2);
    c.fillStyle = "#ffd700";
    c.fillRect(px, py, pw, ph);
    c.fillStyle = "#0b1628";
    c.fillRect(px + inset, py + inset, pw - inset * 2, ph - inset * 2);
    c.fillStyle = "#ffd700";
    c.font = `bold ${Math.round(ph * 0.6)}px "Courier New", monospace`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("$BTH", px + pw / 2, py + ph / 2 + 1);
  }
}
