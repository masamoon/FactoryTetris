/**
 * The 390 px mock of a lifted belt (docs/ROCKHOPPER_LAB_PROJECTS.md, LL1: a lifted piece runs a
 * level up and stops crossing belts on the ground). A developed bot save (seed 1 at 40 min, slow
 * rocks, factories on) is loaded in the real game at phone size, the camera is held at the T3
 * zoom of 0.58, and one dock belt is redrawn over the game as lifted: the ground belt turns into a
 * shadow, the belt runs above it on pylons and eases down to the ground near both ends. Nothing is
 * simulated: the game still draws that belt's plates, which a real lift would remove. Requires
 * the dev server (npm start).
 *
 *   npx tsx tools/rockhopper-lift-mock.ts [outDir]
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { beltPath, crossingsOf } from '../src/rockhopper/sim';
import { serialize } from '../src/rockhopper/save';
import { runBot } from './rockhopper-bot';

const out = process.argv[2] ?? 'docs/reviews/evidence';
const url = process.env.ROCKHOPPER_URL ?? 'http://localhost:8084/';
const ZOOM = 0.58;

const { state: s } = runBot({
  minutes: 40,
  laser: true,
  seed: 1,
  factories: true,
  slowRocks: true,
});
const plates = crossingsOf(s).plates;
// The longest dock belt that crosses another near the hub: long enough to judge the look.
const near = (p: { x: number; y: number }) => Math.hypot(p.x, p.y) < 150;
let pick: { id: number; n: number; tier: number; len: number } | null = null;
for (const m of s.machines) {
  if (m.out?.to.kind !== 'dock') continue;
  const n = plates.filter((p) => near(p) && p.sides.some((q) => q.id === m.id)).length;
  const q = beltPath(s, m)!;
  const len = Math.hypot(q[q.length - 1].x - q[0].x, q[q.length - 1].y - q[0].y);
  if (n > 0 && (!pick || len > pick.len)) pick = { id: m.id, n, tier: m.tier, len };
}
if (!pick) throw new Error('no dock belt');
const m = s.machines.find((x) => x.id === pick!.id)!;
const pts = beltPath(s, m)!;
console.log(
  `seed 1, 40 min: ${plates.length} plates, ${plates.filter(near).length} within 150 u of the hub; lifted belt #${pick.id} (${m.kind}, tier ${pick.tier}), ${pick.n} hub plates, ${pts.length - 1} piece(s), ${pick.len.toFixed(0)} u`
);

/** Drawn in the page, self-contained. */
function install(arg: { zoom: number; pts: { x: number; y: number }[]; tier: number }) {
  const INK = '#16102E',
    DEEP = '#2E2566',
    CREAM = '#FFF4E0',
    MINT = '#3CF0A8',
    MUTED = '#6F66A0';
  type P = { x: number; y: number };
  type R = {
    toScreen(p: P): P;
    cam: { z: number };
    goal(s: unknown, reveal: boolean): { x: number; y: number; z: number };
  };
  const w = window as unknown as { __rockhopper: { renderer: R }; __lift: { on: boolean } };
  const r = w.__rockhopper.renderer;
  const goal = r.goal.bind(r);
  r.goal = (st, rv) => ({ ...goal(st, rv), z: arg.zoom });
  const cv = document.createElement('canvas');
  const dpr = window.devicePixelRatio;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  Object.assign(cv.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: innerWidth + 'px',
    height: innerHeight + 'px',
    pointerEvents: 'none',
    zIndex: '5',
  });
  document.body.append(cv);
  const c = cv.getContext('2d')!;
  w.__lift = { on: false };
  /** World height of the deck, and the run over which it eases down at each end. */
  const H = 7,
    EASE = 22;
  const wide = 2 * (arg.tier - 1);
  // Sample the path every 2 u with the deck height at each sample.
  const total = arg.pts
    .slice(1)
    .reduce((a, b, i) => a + Math.hypot(b.x - arg.pts[i].x, b.y - arg.pts[i].y), 0);
  const samples: { x: number; y: number; h: number }[] = [];
  let run = 0;
  for (let i = 1; i < arg.pts.length; i++) {
    const a = arg.pts[i - 1],
      b = arg.pts[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d <= L; d += 2) {
      const at = run + d;
      const e = Math.min(1, at / EASE, (total - at) / EASE);
      samples.push({
        x: a.x + ((b.x - a.x) * d) / L,
        y: a.y + ((b.y - a.y) * d) / L,
        h: H * e * e * (3 - 2 * e),
      });
    }
    run += L;
  }
  let t = 0;
  const frame = () => {
    t += 1 / 60;
    const z = r.cam.z;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    if (w.__lift.on) {
      const g = samples.map((p) => r.toScreen(p));
      const up = samples.map((p, i) => ({ x: g[i].x, y: g[i].y - p.h * z }));
      const line = (q: P[]) => {
        c.beginPath();
        q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      };
      c.lineCap = 'round';
      c.lineJoin = 'round';
      // The ground belt becomes a soft shadow, cast down and to the right of the deck.
      line(g.map((p, i) => ({ x: p.x + 0.4 * samples[i].h * z, y: p.y + 0.3 * samples[i].h * z })));
      c.strokeStyle = 'rgba(22,16,46,0.72)';
      c.lineWidth = (11 + wide) * z;
      c.stroke();
      // Pylons from the shadow to the deck.
      c.strokeStyle = MUTED;
      c.lineWidth = Math.max(1.5, 2 * z);
      for (let i = 0; i < samples.length; i += 12) {
        if (samples[i].h < H * 0.6) continue;
        c.beginPath();
        c.moveTo(g[i].x, g[i].y);
        c.lineTo(up[i].x, up[i].y);
        c.stroke();
      }
      // The deck, in the belt's own colours, with a cream lip on its upper edge.
      line(up);
      c.strokeStyle = INK;
      c.lineWidth = (10 + wide) * z;
      c.stroke();
      c.strokeStyle = CREAM;
      c.lineWidth = (8 + wide) * z;
      c.stroke();
      c.strokeStyle = DEEP;
      c.lineWidth = (6 + wide) * z;
      c.stroke();
      c.save();
      c.setLineDash([4 * z, 14 * z]);
      c.lineDashOffset = -t * 110 * z;
      c.strokeStyle = MINT;
      c.globalAlpha = 0.9;
      c.lineWidth = 2.6 * z;
      c.stroke();
      c.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function crop(page: Page, name: string, at: { x: number; y: number }) {
  await page.waitForTimeout(300);
  const q = await page.evaluate(
    (p) =>
      (
        window as unknown as {
          __rockhopper: {
            renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
          };
        }
      ).__rockhopper.renderer.toScreen(p),
    at
  );
  const x = Math.max(0, Math.min(390 - 180, q.x - 90));
  await page.screenshot({
    path: path.join(out, name),
    clip: { x, y: Math.max(0, q.y - 70), width: 180, height: 140 },
  });
  console.log(`wrote ${path.join(out, name)}`);
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript((t) => {
    if (!sessionStorage.getItem('mocked')) {
      localStorage.clear();
      localStorage.setItem('rockhopper.save.v3', t);
      sessionStorage.setItem('mocked', '1');
    }
  }, serialize(s));
  await page.goto(url);
  await page.waitForFunction(
    () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
  );
  await page.waitForTimeout(1500);
  await page.evaluate(install, { zoom: ZOOM, pts, tier: pick!.tier });
  await page.waitForTimeout(2500);
  const lift = (on: boolean) =>
    page.evaluate((v) => {
      (window as unknown as { __lift: { on: boolean } }).__lift.on = v;
    }, on);
  // The crop centres on the belt's hub plate nearest the hub, or its midpoint.
  const hubPlate = plates
    .filter((p) => near(p) && p.sides.some((q) => q.id === pick!.id))
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
  const mid = hubPlate ?? pts[Math.floor(pts.length / 2)];
  await lift(false);
  await page.screenshot({ path: path.join(out, 'rockhopper-lift-mock-ground.png') });
  await crop(page, 'rockhopper-lift-mock-ground-crop.png', mid);
  await lift(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'rockhopper-lift-mock-lifted.png') });
  await crop(page, 'rockhopper-lift-mock-lifted-crop.png', mid);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
