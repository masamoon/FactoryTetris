/**
 * The prepared developed save for clip B1 and the 390 px screenshots (docs/ROCKHOPPER_CROSSINGS.md):
 * a bot factory whose dock links are shuffled, keeping only a shuffle a player could build now
 * (every link passes `canTarget`, so no belt runs under a machine), with the most plates.
 *
 *   npx tsx tools/rockhopper-crossings-save.ts [outFile] [oldOutFile]
 *
 * `oldOutFile` is the same save with the crossings field dropped, as a save from before crossings.
 * It then logs clip B2 on that save: income as saved (crossings on and off), then after the
 * three re-routes that untangle the hub knot through a temporary junction.
 */
import { writeFileSync } from 'node:fs';
import { runBot } from './rockhopper-bot';
import { TICK_HZ } from '../src/rockhopper/config';
import {
  canTarget,
  crossingsOf,
  dockPos,
  machinePos,
  relayout,
  route,
  run,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

const clone = (s: State) => deserialize(serialize(s))!;
const ang = (p: { x: number; y: number }) => Math.atan2(p.y, p.x);

function shuffled(s0: State, seed: number) {
  const s = clone(s0);
  const ms = s.machines.filter((m) => m.out?.to.kind === 'dock');
  const sources = [...ms].sort((a, b) => ang(machinePos(a)) - ang(machinePos(b)));
  const docks = ms
    .map((m) => (m.out!.to as { index: number }).index)
    .sort((a, b) => ang(dockPos(s, a)) - ang(dockPos(s, b)));
  let r = seed * 9301 + 49297;
  for (let i = docks.length - 1; i > 0; i--) {
    r = (r * 9301 + 49297) % 233280;
    const j = Math.floor((r / 233280) * (i + 1));
    [docks[i], docks[j]] = [docks[j], docks[i]];
  }
  sources.forEach((m, i) => (m.out!.to = { kind: 'dock', index: docks[i] }));
  relayout(s);
  return s;
}

const legal = (s: State) => s.machines.every((m) => !m.out || canTarget(s, m, m.out.to));

const { state } = runBot({ minutes: 12, laser: true, seed: 1 });
let best: State | null = null,
  bestPlates = -1,
  bestSeed = 0,
  tried = 0,
  ok = 0;
for (let k = 1; k <= 2000; k++) {
  const s = shuffled(state, k);
  tried++;
  if (!legal(s)) continue;
  ok++;
  const n = crossingsOf(s).plates.length;
  if (n > bestPlates) [best, bestPlates, bestSeed] = [s, n, k];
}
if (!best) throw new Error('no legal shuffle');
best.laser = null;
if (!legal(best)) throw new Error('not buildable');
const out = process.argv[2] ?? 'rockhopper-crossings-prepared.json';
writeFileSync(out, serialize(best));
if (process.argv[3]) {
  const old = JSON.parse(serialize(best));
  delete old.crossings;
  writeFileSync(process.argv[3], JSON.stringify(old));
}
console.log(
  `bot seed 1 at 12 min; ${ok} of ${tried} shuffles buildable under C8; shuffle ${bestSeed}: ${bestPlates} plates, every link passes canTarget -> ${out}`
);

/** Credits per second over 120 s, after 15 s to settle. */
function income(s0: State, on = true) {
  const s = clone(s0);
  s.crossings = on;
  run(s, 15 * TICK_HZ);
  const e0 = s.earned;
  run(s, 120 * TICK_HZ);
  return (s.earned - e0) / 120;
}
const on = income(best),
  off = income(best, false);
console.log(`B1 as saved: ${bestPlates} plates, ${on.toFixed(0)}/s on vs ${off.toFixed(0)}/s off`);
// B2: drill 10 hands its dock to smelter 9 by joining smelter 13 for a moment, then takes dock 4.
const b2 = clone(best);
const steps: [number, Parameters<typeof route>[2]][] = [
  [10, { kind: 'smelter', id: 13 }],
  [9, { kind: 'dock', index: 5 }],
  [10, { kind: 'dock', index: 4 }],
];
const done = steps.map(([id, t]) => route(b2, id, t));
console.log(
  `B2 re-routes ${done.every((x) => x === true) ? 'all legal' : `refused: ${done.join(',')}`}: ` +
    `${crossingsOf(b2).plates.length} plates, ${income(b2).toFixed(0)}/s on`
);
