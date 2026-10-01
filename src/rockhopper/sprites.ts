/** Vector artwork from the Rockhopper identity canvas, cached as bitmaps per size. */
import { ORES, type Ore } from './config';

export const INK = '#16102E';
export const NIGHT = '#1E1646';
export const DEEP = '#2E2566';
export const CREAM = '#FFF4E0';
export const CREAM_SHADE = '#E6D3B3';
export const MINT = '#3CF0A8';
export const CORAL = '#FF6B5B';
export const LILAC = '#C9C3E6';
export const MUTED = '#6F66A0';
export const CYAN = '#5EE6FF';
export const YELLOW = '#FFD23F';
export const ORANGE = '#FF8B3D';
export const MAGENTA = '#FF5BD8';

type Ctx = CanvasRenderingContext2D;

function circle(c: Ctx, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 0) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke && lw) {
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.stroke();
  }
}

export function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

function box(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  lw: number
) {
  rrect(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (lw) {
    c.lineWidth = lw;
    c.strokeStyle = INK;
    c.stroke();
  }
}

function path(c: Ctx, d: string, fill?: string, lw = 0) {
  const p = new Path2D(d);
  if (fill) {
    c.fillStyle = fill;
    c.fill(p);
  }
  if (lw) {
    c.lineWidth = lw;
    c.strokeStyle = INK;
    c.lineJoin = 'round';
    c.stroke(p);
  }
}

/** Hop in a 160×160 box, facing up. `flame` 0..1 scales the thruster. */
export function drawHop(c: Ctx, flame = 1) {
  c.save();
  c.translate(80, 124);
  c.scale(1, 0.6 + flame * 0.5);
  c.translate(-80, -124);
  path(c, 'M64 124 Q80 158 96 124 Z', ORANGE, 5);
  path(c, 'M72 124 Q80 142 88 124 Z', YELLOW);
  c.restore();
  path(c, 'M36 84 L14 108 L42 106 Z', MINT, 5);
  path(c, 'M124 84 L146 108 L118 106 Z', MINT, 5);
  c.lineCap = 'round';
  c.lineWidth = 5;
  c.strokeStyle = INK;
  c.beginPath();
  c.moveTo(80, 36);
  c.lineTo(80, 16);
  c.stroke();
  circle(c, 80, 13, 8, YELLOW, INK, 5);
  circle(c, 80, 80, 46, CREAM);
  path(c, 'M36 92 Q80 142 124 92 Q80 116 36 92 Z', CREAM_SHADE);
  circle(c, 80, 80, 46, undefined, INK, 6);
  box(c, 44, 58, 72, 38, 19, NIGHT, 5);
  box(c, 66, 66, 28, 22, 11, CYAN, 0);
  circle(c, 87, 72, 4, '#FFFFFF');
  circle(c, 52, 112, 4, INK);
  circle(c, 108, 112, 4, INK);
}

/** Hub in a 200×200 box. `spin` rotates the ring lights (radians). */
export function drawHub(c: Ctx, spin = 0) {
  circle(c, 100, 100, 92, 'rgba(60,240,168,0.12)');
  c.lineCap = 'round';
  for (const [w, col] of [
    [16, INK],
    [7, CREAM],
  ] as const) {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(100, 22);
    c.lineTo(100, 178);
    c.moveTo(22, 100);
    c.lineTo(178, 100);
    c.stroke();
  }
  circle(c, 100, 100, 74, undefined, INK, 26);
  circle(c, 100, 100, 74, undefined, MINT, 15);
  c.save();
  c.setLineDash([4, 16]);
  c.lineDashOffset = -spin * 74;
  circle(c, 100, 100, 74, undefined, CREAM, 5);
  c.restore();
  circle(c, 100, 100, 44, CREAM, INK, 6);
  path(c, 'M62 112 Q100 150 138 112 Q100 132 62 112 Z', CREAM_SHADE);
  circle(c, 100, 100, 26, DEEP, INK, 5);
  circle(c, 100, 100, 13, MINT);
  circle(c, 95, 95, 4, '#FFFFFF');
}

/** Drill in a 100×120 box, bit pointing down. */
export function drawDrill(c: Ctx) {
  path(c, 'M28 72 L72 72 L50 116 Z', '#C9C3E6', 5);
  c.lineWidth = 3;
  c.strokeStyle = INK;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(36, 84);
  c.lineTo(62, 80);
  c.moveTo(41, 97);
  c.lineTo(57, 94);
  c.stroke();
  box(c, 14, 18, 72, 58, 14, MINT, 5);
  box(c, 14, 56, 72, 16, 4, YELLOW, 4);
  c.fillStyle = INK;
  for (const x of [20, 40, 60]) path(c, `M${x + 6} 58 L${x + 14} 58 L${x + 8} 70 L${x} 70 Z`, INK);
  box(c, 30, 5, 40, 17, 6, CREAM, 4);
  circle(c, 50, 37, 11, NIGHT, INK, 4);
  circle(c, 50, 37, 5, CYAN);
}

/** Smelter in a 140×140 box. `heat` 0..1 brightens the mouth. */
export function drawSmelter(c: Ctx, heat = 0) {
  box(c, 88, 16, 24, 40, 5, CREAM, 5);
  path(c, 'M18 128 L122 128 L112 50 L28 50 Z', CORAL, 6);
  path(c, 'M24 116 L116 116 L118 128 L20 128 Z', '#D94B45');
  path(c, 'M18 128 L122 128 L112 50 L28 50 Z', undefined, 6);
  box(c, 20, 42, 100, 18, 7, CREAM, 5);
  box(c, 42, 72, 56, 38, 16, heat > 0.05 ? '#FFB23F' : YELLOW, 5);
  box(c, 54, 80, 32, 18, 9, heat > 0.05 ? '#FFFFFF' : CREAM, 0);
  circle(c, 30, 100, 4, INK);
  circle(c, 110, 100, 4, INK);
}

/** A factory: two hoppers feeding one press, in the 140×140 design box. */
export function drawFactory(c: Ctx, busy = false) {
  path(c, 'M24 128 L116 128 L116 62 L24 62 Z', DEEP, 6);
  path(c, 'M24 116 L116 116 L116 128 L24 128 Z', NIGHT);
  path(c, 'M24 128 L116 128 L116 62 L24 62 Z', undefined, 6);
  // Two hoppers: the two bars that go in.
  path(c, 'M18 22 L60 22 L50 58 L28 58 Z', ORANGE, 5);
  path(c, 'M80 22 L122 22 L112 58 L90 58 Z', MAGENTA, 5);
  box(c, 46, 74, 48, 34, 10, busy ? '#FFB23F' : YELLOW, 5);
  box(c, 56, 82, 28, 14, 7, busy ? '#FFFFFF' : CREAM, 0);
  circle(c, 34, 104, 4, INK);
  circle(c, 106, 104, 4, INK);
}

/** An alloy: one chunk split diagonally in the colours of its two ores. */
export function drawAlloy(c: Ctx, a: Ore, b: Ore, r: number) {
  const o = Math.max(0.9, r * 0.28);
  const k = r * 1.15;
  c.save();
  c.rotate(Math.PI / 4);
  rrect(c, -k - o, -k - o, 2 * (k + o), 2 * (k + o), (k + o) * 0.35);
  c.fillStyle = INK;
  c.fill();
  rrect(c, -k, -k, 2 * k, 2 * k, k * 0.3);
  c.clip();
  c.fillStyle = ORES[a].color;
  c.fillRect(-k, -k, 2 * k, k);
  c.fillStyle = ORES[b].color;
  c.fillRect(-k, 0, 2 * k, k);
  c.fillStyle = INK;
  c.fillRect(-k, -o * 0.35, 2 * k, o * 0.7);
  c.restore();
}

const cache = new Map<string, HTMLCanvasElement>();

/** A cached bitmap of a sprite drawn into a `w`×`h` design box at `px` pixels wide. */
export function sprite(key: string, w: number, h: number, px: number, draw: (c: Ctx) => void) {
  const size = Math.max(8, Math.min(512, Math.ceil(px / 8) * 8));
  const k = `${key}:${size}`;
  let canvas = cache.get(k);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = Math.ceil((size * h) / w);
    const c = canvas.getContext('2d')!;
    c.scale(size / w, size / w);
    draw(c);
    cache.set(k, canvas);
  }
  return canvas;
}

// ---------------------------------------------------------------- chunks

/** Draw an ore chunk (or bar) centred at 0,0 with half-size `r`, ink outline included. */
export function drawChunk(c: Ctx, ore: Ore, r: number, bar = false, outline = true) {
  const color = ORES[ore].color;
  const o = outline ? Math.max(0.9, r * 0.28) : 0;
  const shape = (k: number) => {
    c.beginPath();
    if (bar) {
      const w = k * 1.55,
        h = k * 0.85;
      c.moveTo(-w * 0.72, -h);
      c.lineTo(w * 0.72, -h);
      c.lineTo(w, h);
      c.lineTo(-w, h);
      c.closePath();
      return;
    }
    switch (ore) {
      case 1:
        rrect(c, -k, -k, 2 * k, 2 * k, k * 0.45);
        break;
      case 2:
        c.arc(0, 0, k * 1.05, 0, Math.PI * 2);
        break;
      case 3:
        c.moveTo(0, -k * 1.2);
        c.lineTo(k * 1.1, k * 0.9);
        c.lineTo(-k * 1.1, k * 0.9);
        c.closePath();
        break;
      case 4:
        c.moveTo(0, -k * 1.25);
        c.lineTo(k * 1.1, 0);
        c.lineTo(0, k * 1.25);
        c.lineTo(-k * 1.1, 0);
        c.closePath();
        break;
      default:
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const x = Math.cos(a) * k * 1.12,
            y = Math.sin(a) * k * 1.12;
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.closePath();
    }
  };
  if (o) {
    shape(r + o);
    c.fillStyle = INK;
    c.fill();
  }
  shape(r);
  c.fillStyle = color;
  c.fill();
  if (bar) {
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(-r * 0.6, -r * 0.45, r * 1.1, r * 0.3);
  } else if (r > 2.5) {
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(-r * 0.55, -r * 0.6, r * 0.5, r * 0.35);
  }
}

/** Coin icon (hexagon) for canvas price tags. */
export function drawCoin(c: Ctx, r: number) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i;
    if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = YELLOW;
  c.fill();
  c.lineWidth = Math.max(1, r * 0.22);
  c.strokeStyle = INK;
  c.stroke();
}

export const COIN_SVG =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="#FFD23F" stroke="#16102E" stroke-width="2"/><polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="#FFE98A"/></svg>';
