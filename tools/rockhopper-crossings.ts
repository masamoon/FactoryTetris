/**
 * Headless witness for belt crossings (docs/ROCKHOPPER_CROSSINGS.md). It reports:
 *   1. two crossed belts at several angles and loads: chunks/s each, crossings on and off;
 *   2. tangled vs tidy: the greedy bot's 20-minute factories as built, with their dock links
 *      sorted into the sources' angular order (tidy), and shuffled (only shuffles a player could
 *      build under the clear-lanes rule); income over 120 s after a 15 s settle;
 *   3. a careless bot that re-routes dock links at random, and how often clear lanes refuse;
 *   4. the clip's B2 beat: settled rates of two crossed trunks before and after a drill move.
 * Bot factories are an upper bound on pace, not a playtest.
 *
 *   npx tsx tools/rockhopper-crossings.ts
 */
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  buildDrill,
  canTarget,
  crossingsOf,
  dockPos,
  drills,
  freshState,
  machinePos,
  moveDrill,
  relayout,
  route,
  run,
  step,
  upgrade,
  widen,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';
import { refusals, runBot } from './rockhopper-bot';

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

/** Every link legal as it stands (target matrix and clear lanes): a layout a player can build. */
const legal = (s: State) => s.machines.every((m) => !m.out || canTarget(s, m, m.out.to));

console.log('\n2. Tangled vs tidy, bot factories at 20 min (credits/s over 120 s)');
console.log('   Shuffles keep only layouts a player could build now (clear lanes, C8).');
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const seed of [1, 2, 3]) {
  const { state } = runBot({ minutes: 20, laser: true, seed });
  const off = income(state, false);
  const row = (name: string, s: State) => {
    const c = clone(s);
    c.crossings = true;
    const on = income(s, true);
    return `    ${name.padEnd(12)} plates ${String(crossingsOf(c).plates.length).padStart(2)}  on ${on.toFixed(0)}  (${((on / off - 1) * 100).toFixed(0)}% vs off ${off.toFixed(0)})`;
  };
  console.log(`  seed ${seed}`);
  console.log(row('as built', state));
  console.log(row('tidy', reassign(state, 'tidy')));
  const shuffles: { plates: number; loss: number }[] = [];
  let tried = 0;
  for (let k = 1; k <= 400 && shuffles.length < 12; k++) {
    const s = reassign(state, 'shuffle', k);
    tried++;
    if (!legal(s)) continue;
    const c = clone(s);
    c.crossings = true;
    shuffles.push({
      plates: crossingsOf(c).plates.length,
      loss: (income(s, true) / off - 1) * 100,
    });
  }
  const losses = shuffles.map((x) => x.loss);
  console.log(
    `    legal shuffles: ${shuffles.length} of ${tried} tried; plates ${Math.min(...shuffles.map((x) => x.plates))}–${Math.max(...shuffles.map((x) => x.plates))}; income change best ${Math.max(...losses).toFixed(0)}%, median ${median(losses).toFixed(0)}%, worst ${Math.min(...losses).toFixed(0)}%`
  );
}

console.log('\n3. A careless bot (re-routes one dock link at random every 10 s), 20 min');
for (const seed of [1, 2, 3]) {
  for (const messy of [false, true]) {
    const { state } = runBot({ minutes: 20, laser: true, seed, messy });
    const r = { ...refusals };
    const c = clone(state);
    c.crossings = true;
    const on = income(state, true),
      off = income(state, false);
    console.log(
      `  seed ${seed} ${messy ? 'careless' : 'greedy  '}  earned ${(state.earned / 1000).toFixed(0)}k  plates ${crossingsOf(c).plates.length}  income on ${on.toFixed(0)} off ${off.toFixed(0)} (${((on / off - 1) * 100).toFixed(0)}%)` +
        `  | lanes refused: socket spots ${r.onBelt} on a belt + ${r.spotBlocked} blocked of ${r.spots}; link targets ${r.linkBlocked} of ${r.links}`
    );
  }
}

console.log(
  '\n4. Clip B2 witness: two level-5 drills kept supplied (staged), their trunks crossed'
);
{
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.9);
  buildDrill(s, 0, Math.PI * 0.55);
  const [a, b] = drills(s);
  route(s, a.id, { kind: 'dock', index: 7 });
  route(s, b.id, { kind: 'dock', index: 8 });
  route(s, a.id, { kind: 'dock', index: 2 });
  route(s, b.id, { kind: 'dock', index: 0 });
  for (const d of [a, b]) while (d.level < 5) upgrade(s, d.id);
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  const window = (from: number, to: number) => {
    const got = new Map<number, number>();
    for (let t = from; t < to; t++) {
      for (const d of [a, b]) d.buffer = [2, 2, 2, 2];
      step(s);
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1);
      s.events.length = 0;
    }
    const secs = (to - from) / TICK_HZ;
    return [a, b].map((d) =>
      ((got.get((d.out!.to as { index: number }).index) ?? 0) / secs).toFixed(2)
    );
  };
  window(0, 5 * TICK_HZ);
  console.log(
    `  crossed (plates ${crossingsOf(s).plates.length}), settled 5–25 s: ${window(5 * TICK_HZ, 25 * TICK_HZ).join(' / ')} chunks/s`
  );
  // The player moves drill A round its rock until its belt no longer crosses.
  let moved = '';
  for (let k = 1; k < 60 && !moved; k++) {
    for (const dir of [1, -1]) {
      const ang = Math.PI * 0.9 + dir * k * 0.05;
      if (moveDrill(s, a.id, 0, ang) === true && !crossingsOf(s).plates.length) {
        moved = `moved A by ${((dir * k * 0.05 * 180) / Math.PI).toFixed(0)}°`;
        break;
      }
    }
  }
  window(0, 5 * TICK_HZ);
  console.log(
    `  ${moved || 'no move found'} (plates ${crossingsOf(s).plates.length}), backlog flushed for 5 s, settled next 20 s: ${window(0, 20 * TICK_HZ).join(' / ')} chunks/s (cap ${beltCapacity(1)})`
  );
}
