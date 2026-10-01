/**
 * Sectors witness: generates many sectors and checks each is legal (rocks clear of each other and
 * of the hub, every slot placed by the generator rather than its fallback), then reports how much
 * they differ from each other and from the classic field. Exits non-zero on any illegal sector.
 *
 *   npx tsx tools/rockhopper-sectors.ts [-- --seeds 2000]
 */
import {
  CELL,
  CLASSIC_SLOTS,
  HUB_RADIUS,
  ORES,
  RIM_GAP,
  SLOTS,
  type SlotDef,
} from '../src/rockhopper/config';
import { sectorSlots, useSector } from '../src/rockhopper/sector';
import { generateRock } from '../src/rockhopper/sim';

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const N = arg('--seeds', 2000);
const rim = (d: SlotDef) => d.r * CELL + RIM_GAP;

/** How many rocks lie across the straight line from a rock to the hub (belts must go round). */
function blockers(defs: readonly SlotDef[], i: number): number {
  const a = defs[i];
  let n = 0;
  defs.forEach((b, k) => {
    if (k === i) return;
    // Distance from b's centre to the segment a → hub.
    const L2 = a.x * a.x + a.y * a.y;
    const t = Math.max(0, Math.min(1, (b.x * a.x + b.y * a.y) / L2));
    const d = Math.hypot(b.x - a.x * t, b.y - a.y * t);
    if (t > 0 && t < 1 && d < rim(b)) n++;
  });
  return n;
}

let bad = 0;
const value: number[][] = CLASSIC_SLOTS.map(() => []);
const cells: number[][] = CLASSIC_SLOTS.map(() => []);
const shapes = new Map<string, number>();
const veins = new Map<string, number>();
let flank = 0,
  blocked = 0,
  firstIce = 0;
const pos: number[][] = CLASSIC_SLOTS.map(() => []);
for (let seed = 1; seed <= N; seed++) {
  const defs = sectorSlots(seed);
  defs.forEach((d, i) => {
    const c = CLASSIC_SLOTS[i];
    if (Math.hypot(d.x, d.y) < rim(d) + HUB_RADIUS + 110) {
      bad++;
      console.log(`seed ${seed}: slot ${i} crowds the hub`);
    }
    for (let k = 0; k < i; k++)
      if (Math.hypot(d.x - defs[k].x, d.y - defs[k].y) < rim(d) + rim(defs[k]) + 14) {
        bad++;
        console.log(`seed ${seed}: slots ${k} and ${i} overlap`);
      }
    if (i > 0 && d.x === c.x && d.y === c.y) {
      bad++;
      console.log(`seed ${seed}: slot ${i} fell back to its classic spot`);
    }
    pos[i].push(Math.hypot(d.x, d.y));
    shapes.set(d.shape!.kind, (shapes.get(d.shape!.kind) ?? 0) + 1);
    veins.set(d.veins!.kind, (veins.get(d.veins!.kind) ?? 0) + 1);
    blocked += blockers(defs, i) > 0 ? 1 : 0;
  });
  if (defs.some((d) => d.y > -205)) flank++;
  if (defs[1].signature !== CLASSIC_SLOTS[1].signature) firstIce++;
  useSector(seed, true);
  SLOTS.forEach((_, i) => {
    const r = generateRock(i, 0, seed);
    cells[i].push(r.total);
    value[i].push(r.cells.reduce((a, c) => a + (c ? ORES[c as 1].value : 0), 0));
  });
}

const classic = CLASSIC_SLOTS.map((_, i) => {
  useSector(1, false);
  const r = generateRock(i, 0, 1);
  return { cells: r.total, value: r.cells.reduce((a, c) => a + (c ? ORES[c as 1].value : 0), 0) };
});
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a: number[], q: number) =>
  [...a].sort((x, y) => x - y)[Math.floor(q * (a.length - 1))];

console.log(`${N} sectors, ${bad} problems\n`);
console.log('slot  tier  dist to hub (p10–p90)   cells vs classic    value vs classic (p10–p90)');
CLASSIC_SLOTS.forEach((d, i) => {
  const v = value[i].map((x) => x / classic[i].value);
  console.log(
    `${i}     T${d.tier}    ${pct(pos[i], 0.1).toFixed(0)}–${pct(pos[i], 0.9).toFixed(0)} (classic ${Math.hypot(d.x, d.y).toFixed(0)})`.padEnd(
      42
    ) +
      `${((mean(cells[i]) / classic[i].cells) * 100).toFixed(0)}%`.padEnd(20) +
      `${(mean(v) * 100).toFixed(0)}% (${(pct(v, 0.1) * 100).toFixed(0)}–${(pct(v, 0.9) * 100).toFixed(0)}%)`
  );
});
console.log(`\nshapes: ${[...shapes].map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`veins:  ${[...veins].map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(
  `a rock beside the hub: ${((flank / N) * 100).toFixed(0)}% of sectors; second rock is ice: ${((firstIce / N) * 100).toFixed(0)}%`
);
console.log(
  `rocks with another rock across their straight line to the hub: ${((blocked / (N * 8)) * 100).toFixed(0)}% (classic ${(
    (CLASSIC_SLOTS.filter((_, i) => blockers(CLASSIC_SLOTS, i) > 0).length / 8) *
    100
  ).toFixed(0)}%)`
);
if (bad) process.exit(1);
