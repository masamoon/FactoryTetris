/**
 * Headless witness for belt crossings (docs/ROCKHOPPER_CROSSINGS.md). It reports:
 *   1. two crossed belts at several angles and loads: chunks/s each, crossings on and off;
 *   2. tangled vs tidy: the greedy bot's 20-minute factories with their dock links kept,
 *      sorted into the sources' angular order (tidy), shuffled, or reversed (tangled);
 *      income over 120 s after a 15 s settle, crossings on and off.
 * Bot factories are an upper bound on pace, not a playtest.
 *
 *   npx tsx tools/rockhopper-crossings.ts
 */
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  buildDrill,
  crossingsOf,
  dockPos,
  drills,
  freshState,
  machinePos,
  relayout,
  route,
  run,
  step,
  widen,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';
import { runBot } from './rockhopper-bot';

function pair(angA: number, angB: number, rate: number, on: boolean, tier = 1) {
  const s = freshState(1);
  s.crossings = on;
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, angA);
  buildDrill(s, 0, angB);
  const [a, b] = drills(s);
  route(s, a.id, { kind: 'dock', index: 7 });
  route(s, b.id, { kind: 'dock', index: 8 });
  route(s, a.id, { kind: 'dock', index: 2 });
  route(s, b.id, { kind: 'dock', index: 1 });
  for (let t = 1; t < tier; t++) {
    widen(s, a.id);
    widen(s, b.id);
  }
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  const plates = crossingsOf(s).plates;
  const got = new Map<number, number>();
  let acc = 0;
  for (let i = 0; i < 45 * TICK_HZ; i++) {
    acc += rate / TICK_HZ;
    for (const d of [a, b]) {
      if (rate === Infinity) d.buffer = [2, 2, 2, 2];
      else if (acc >= 1 && d.buffer.length < 4) d.buffer.push(2);
    }
    if (acc >= 1) acc -= 1;
    step(s);
    if (i >= 5 * TICK_HZ)
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1);
    s.events.length = 0;
  }
  const r = (k: number) => ((got.get(k) ?? 0) / 40).toFixed(2);
  const angle = plates.map((p) => ((p.angle * 180) / Math.PI).toFixed(0)).join(',') || '-';
  return { angle, text: `${r(2)} / ${r(1)}` };
}

console.log('1. Two crossed belts (chunks/s each; tier-1 cap %s)', beltCapacity(1));
for (const [a, b] of [
  [Math.PI, 0],
  [Math.PI * 0.6, Math.PI * 0.4],
  [Math.PI * 0.9, Math.PI * 0.55],
]) {
  const on = pair(a, b, Infinity, true);
  console.log(
    `  crossing ${on.angle.padStart(3)}°  saturated: on ${on.text}, off ${pair(a, b, Infinity, false).text}` +
      `  | 3/s each: on ${pair(a, b, 3, true).text}  | tier 2 saturated: on ${pair(a, b, Infinity, true, 2).text}`
  );
}

const clone = (s: State) => deserialize(serialize(s))!;
function income(s0: State, on: boolean) {
  const s = clone(s0);
  s.crossings = on;
  run(s, 15 * TICK_HZ);
  const e0 = s.earned;
  run(s, 120 * TICK_HZ);
  return (s.earned - e0) / 120;
}
function reassign(s0: State, mode: 'tidy' | 'shuffle' | 'tangle', seed = 1) {
  const s = clone(s0);
  const ms = s.machines.filter((m) => m.out?.to.kind === 'dock');
  const ang = (p: { x: number; y: number }) => Math.atan2(p.y, p.x);
  const sources = [...ms].sort((a, b) => ang(machinePos(a)) - ang(machinePos(b)));
  const docks = ms
    .map((m) => (m.out!.to as { index: number }).index)
    .sort((a, b) => ang(dockPos(a)) - ang(dockPos(b)));
  if (mode === 'tangle') docks.reverse();
  if (mode === 'shuffle') {
    let r = seed * 9301 + 49297;
    for (let i = docks.length - 1; i > 0; i--) {
      r = (r * 9301 + 49297) % 233280;
      const j = Math.floor((r / 233280) * (i + 1));
      [docks[i], docks[j]] = [docks[j], docks[i]];
    }
  }
  // Direct links, like a save from before crossings: the lane rule is not applied here.
  sources.forEach((m, i) => (m.out!.to = { kind: 'dock', index: docks[i] }));
  relayout(s);
  return s;
}

console.log('\n2. Tangled vs tidy (bot factories at 20 min; credits/s over 120 s)');
for (const seed of [1, 2, 3]) {
  const { state } = runBot({ minutes: 20, laser: true, seed });
  console.log(`  seed ${seed}`);
  for (const [name, s] of [
    ['as built', state],
    ['tidy', reassign(state, 'tidy')],
    ['shuffled 1', reassign(state, 'shuffle', 1)],
    ['shuffled 2', reassign(state, 'shuffle', 2)],
    ['tangled', reassign(state, 'tangle')],
  ] as const) {
    const on = income(s, true),
      off = income(s, false);
    const c = clone(s);
    c.crossings = true;
    const n = crossingsOf(c).plates.length;
    const loss = ((on / off - 1) * 100).toFixed(0);
    console.log(
      `    ${name.padEnd(10)} plates ${String(n).padStart(2)}  on ${on.toFixed(0)}  off ${off.toFixed(0)}  (${loss}%)`
    );
  }
}
