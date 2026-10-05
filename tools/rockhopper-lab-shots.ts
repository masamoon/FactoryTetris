/**
 * 390 px screenshots of the research Lab prototype (docs/ROCKHOPPER_LAB_PROJECTS.md). A developed
 * bot save (seed 1 at 40 min, slow rocks, factories on) gets research switched on, a Lab clamped
 * on a dock belt, the first lift bill met and one lift bought and raised on the dock belt with the
 * most hub plates. Shots: the field with the deck, the Lab's bubble, and the Lift tool. Requires
 * the dev server (npm start).
 *
 *   npx tsx tools/rockhopper-lab-shots.ts [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { LIFT_BILLS } from '../src/rockhopper/config';
import {
  beltPath,
  crossingsOf,
  labSnap,
  pathLength,
  placeLab,
  pointAlong,
  raisePiece,
  setLabActive,
  setResearch,
} from '../src/rockhopper/sim';
import { serialize } from '../src/rockhopper/save';
import { runBot } from './rockhopper-bot';

const out = process.argv[2] ?? 'docs/reviews/evidence';
const url = process.env.ROCKHOPPER_URL ?? 'http://localhost:8084/';

const { state: s } = runBot({
  minutes: 40,
  laser: true,
  seed: 1,
  factories: true,
  slowRocks: true,
});
if (setResearch(s, true) !== true) throw new Error('research');
const plates = crossingsOf(s).plates;
const near = (p: { x: number; y: number }) => Math.hypot(p.x, p.y) < 150;
// As in the lift mock: the longest dock belt that crosses another near the hub gets the lift, on
// the piece holding its plate nearest the hub; the Lab clamps on another dock belt.
const dockBelts = s.machines.filter((m) => m.out?.to.kind === 'dock');
const score = (id: number) =>
  plates
    .filter((p) => near(p) && p.sides.some((q) => q.id === id))
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
const span = (m: (typeof dockBelts)[number]) => {
  const q = beltPath(s, m)!;
  return Math.hypot(q[q.length - 1].x - q[0].x, q[q.length - 1].y - q[0].y);
};
const lifted = dockBelts.filter((m) => score(m.id).length).sort((a, b) => span(b) - span(a))[0];
const piece = (() => {
  const side = score(lifted.id)[0].sides.find((q) => q.id === lifted.id)!;
  const pts = beltPath(s, lifted)!;
  let run = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    run += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
    if (side.at <= run) return k;
  }
  return 0;
})();
let placed = false;
for (const m of dockBelts) {
  if (m.id === lifted.id) continue;
  const p = beltPath(s, m)!;
  const at = labSnap(s, pointAlong(p, pathLength(p) / 2));
  if (at && placeLab(s, at) === true) {
    placed = true;
    break;
  }
}
if (!placed) throw new Error('no Lab spot');
const r = s.research!;
r.counts = { ...(r.counts ?? {}), lift0: LIFT_BILLS[0].count };
r.lifts.owned = 1;
if (raisePiece(s, lifted.id, piece) !== true) throw new Error('raise');
setLabActive(s, 'lift1');
s.events = [];
console.log(
  `seed 1, 40 min: learned ${r.learned?.join(', ')}; Lab on belt #${r.lab!.owner}; lifted #${lifted.id} piece ${piece} (${score(lifted.id).length} hub plates)`
);

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
    if (!sessionStorage.getItem('shot')) {
      localStorage.clear();
      localStorage.setItem('rockhopper.save.v3', t);
      localStorage.setItem(
        'rockhopper.settings.v1',
        JSON.stringify({ factories: true, research: true, sectors: true, slowRocks: true })
      );
      sessionStorage.setItem('shot', '1');
    }
  }, serialize(s));
  await page.goto(url);
  await page.waitForFunction(
    () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
  );
  await page.waitForTimeout(3000);
  const shot = async (name: string) => {
    await page.screenshot({ path: path.join(out, name) });
    console.log(`wrote ${path.join(out, name)}`);
  };
  await shot('rockhopper-lab-field.png');
  // Open the Lab's bubble with a tap on it.
  const at = await page.evaluate(() => {
    const app = (
      window as unknown as {
        __rockhopper: {
          state: { research: { lab: { x: number; y: number } } };
          renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
        };
      }
    ).__rockhopper;
    const lab = app.state.research.lab;
    return app.renderer.toScreen({ x: lab.x, y: lab.y - 6 });
  });
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(600);
  await shot('rockhopper-lab-bubble.png');
  const place = page.locator('.rh-bubble button', { hasText: 'Lift tool' });
  await place.tap();
  await page.waitForTimeout(800);
  await shot('rockhopper-lab-lift-tool.png');
  // The Lift tool round trip: a tap on the lifted piece lowers it, a second tap lifts it again.
  const raised = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __rockhopper: { state: { research: { lifts: { raised: unknown[] } } } };
          }
        ).__rockhopper.state.research.lifts.raised.length
    );
  const lp = beltPath(s, lifted)!;
  const mid = await page.evaluate(
    (q) =>
      (
        window as unknown as {
          __rockhopper: {
            renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
          };
        }
      ).__rockhopper.renderer.toScreen(q),
    { x: (lp[piece].x * 2 + lp[piece + 1].x) / 3, y: (lp[piece].y * 2 + lp[piece + 1].y) / 3 }
  );
  await page.touchscreen.tap(mid.x, mid.y);
  await page.waitForTimeout(200);
  const lowered = await raised();
  await page.touchscreen.tap(mid.x, mid.y);
  await page.waitForTimeout(200);
  console.log(
    `Lift tool taps: ${lowered} raised after the first, ${await raised()} after the second`
  );
  // Close-ups at 1.6x zoom: the Lab on its belt, then the deck over the hub plates.
  await page.touchscreen.tap(20, 600);
  const focus = async (p: { x: number; y: number }, name: string) => {
    await page.evaluate((q) => {
      type G = (s: unknown, rv: boolean) => { x: number; y: number; z: number };
      const r = (window as unknown as { __rockhopper: { renderer: { goal: G; __goal?: G } } })
        .__rockhopper.renderer;
      r.__goal ??= r.goal.bind(r);
      r.goal = () => ({ x: q.x, y: q.y, z: 1.6 });
    }, p);
    await page.waitForTimeout(2500);
    await shot(name);
  };
  await focus(r.lab!, 'rockhopper-lab-closeup.png');
  const pts = beltPath(s, lifted)!;
  await focus(
    { x: (pts[piece].x + pts[piece + 1].x) / 2, y: (pts[piece].y + pts[piece + 1].y) / 2 },
    'rockhopper-lab-deck-closeup.png'
  );
  // The same view with research off: the piece back on the ground, for comparison.
  await page.evaluate(() => {
    (
      window as unknown as { __rockhopper: { state: { research: { on: boolean } } } }
    ).__rockhopper.state.research.on = false;
  });
  await page.waitForTimeout(800);
  await shot('rockhopper-lab-deck-closeup-ground.png');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
