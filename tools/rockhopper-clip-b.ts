/**
 * Headless witness for segment B of the Rockhopper clip (a disclosed, staged developed save).
 * It builds the staged scene with legal commands only, then logs what the simulation does:
 * cells remaining, belt deliveries per second (crumble arrivals excluded), piles and chips.
 *
 *   npx tsx tools/rockhopper-clip-b.ts [outFile]
 *
 * B1  Three level-2 drills chained through the middle drill onto one tier-1 belt.
 * B2  The player widens the junction's belt to tier 2 and the hold runs until the rock crumbles.
 * B3  On another rock, two level-1 drills feed a smelter spliced into their line.
 */
import { writeFileSync } from 'node:fs';
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  beltEnds,
  buildDrill,
  buildSmelter,
  canSplice,
  drills,
  freshState,
  route,
  smelterSpotOk,
  smelters,
  step,
  unlock,
  upgrade,
  widen,
  type SimEvent,
  type State,
} from '../src/rockhopper/sim';

const lines: string[] = [];
const log = (l: string) => {
  lines.push(l);
  console.log(l);
};

/** Advance `secs`, returning belt deliveries per second into docks and whether it crumbled. */
function window(s: State, secs: number, slot: number, dock: number) {
  let chunks = 0,
    value = 0,
    bars = 0,
    crumbled = false;
  const n = Math.round(secs * TICK_HZ);
  for (let i = 0; i < n; i++) {
    step(s);
    for (const e of s.events as SimEvent[]) {
      if (e.type === 'crumble' && e.slot === slot) crumbled = true;
      if (e.type === 'deliver' && e.dock === dock) {
        chunks++;
        value += e.value;
        if (e.bar) bars++;
      }
    }
    s.events.length = 0;
  }
  return { rate: chunks / secs, value: value / secs, bars: bars / secs, crumbled };
}

const s = freshState(1);
s.credits = 1e7;
// B1 is staged on a T2 rock (about 200 cells) so the scene outlasts the explanation.
const B = 3;
for (const i of [1, 2, 3]) unlock(s, i);
for (let i = 0; i < 3 * TICK_HZ; i++) step(s);
for (let k = 0; k < 3; k++) buildDrill(s, B, k);
const [a, b, c] = drills(s);
route(s, a.id, { kind: 'drill', id: b.id });
route(s, c.id, { kind: 'drill', id: b.id });
for (const m of [a, b, c]) while (m.level < 2) upgrade(s, m.id);
const dock = (b.out!.to as { index: number }).index;
s.events.length = 0;
log(`staged: seed 1, three level-2 drills on slot ${B} (T2); junction #${b.id} -> dock ${dock}`);
log(`B1 start: cells remaining ${s.slots[B].rock!.remaining} of ${s.slots[B].rock!.total}`);
window(s, 7, B, dock); // the belts fill up: not reported
const w0 = window(s, 3, B, dock);
log(
  `B1 saturated (3 s after 7 s fill): ${w0.rate.toFixed(1)} chunks/s through a tier-1 belt (capacity ${beltCapacity(1).toFixed(1)}); junction full=${b.full}; feeders full=${a.full},${c.full}; cells ${s.slots[B].rock?.remaining}`
);
widen(s, b.id);
log(`B2 widen: junction belt tier ${b.tier} (capacity ${beltCapacity(b.tier).toFixed(1)})`);
const flush = window(s, 2, B, dock);
log(`B2 +2 s backlog flush (not settled income): ${flush.rate.toFixed(1)} chunks/s`);
let t = 2;
for (;;) {
  const w = window(s, 1, B, dock);
  t++;
  log(
    `B2 +${t} s: ${w.rate.toFixed(1)} chunks/s, ${w.value.toFixed(0)} credits/s from the belt; cells ${s.slots[B].rock?.remaining ?? 0}${w.crumbled ? '  (CRUMBLE: depletion; crumble arrivals excluded)' : ''}`
  );
  if (w.crumbled || t > 14) break;
}

// B3: a second rock with two level-1 drills on one line into a spliced smelter.
s.events.length = 0;
buildDrill(s, 1, 0);
buildDrill(s, 1, 1);
const [d1, d2] = drills(s).filter((d) => d.slot === 1);
route(s, d2.id, { kind: 'drill', id: d1.id });
const dock3 = d1.out ? (d1.out.to as { index: number }).index : -1;
const e = beltEnds(s, d1)!;
let spot = null;
for (let f = 0.1; f < 0.95 && !spot; f += 0.02) {
  const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
  if (smelterSpotOk(s, p) && canSplice(s, d1, null, p)) spot = p;
}
log(`B3 staged: slot 1 drills #${d1.id} <- #${d2.id}, line to dock ${dock3}`);
window(s, 6, 1, dock3); // fill
const before = window(s, 3, 1, dock3);
log(`B3 before: ${before.rate.toFixed(1)} chunks/s, ${before.value.toFixed(1)} credits/s`);
log(
  `B3 splice at ${spot ? `${spot.x.toFixed(0)},${spot.y.toFixed(0)}` : 'none'}: ${spot ? buildSmelter(s, spot, d1.id) : 'no spot'}`
);
window(s, 4, 1, dock3); // fill
const after = window(s, 3, 1, dock3);
log(
  `B3 after: ${after.bars.toFixed(1)} bars/s, ${after.value.toFixed(1)} credits/s (x${(after.value / Math.max(0.01, before.value)).toFixed(2)}); smelter jam=${smelters(s)[0].jam}${after.crumbled ? '  (CRUMBLE inside window)' : ''}`
);
log(
  `slot 1 cells remaining ${s.slots[1].rock?.remaining ?? 0} of ${s.slots[1].rock?.total ?? '-'}`
);
const out = process.argv[2];
if (out) writeFileSync(out, lines.join('\n') + '\n');
