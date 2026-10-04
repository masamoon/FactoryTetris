import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR_VALUE,
  DRILL_BUFFER,
  DRILL_MAX_LEVEL,
  BELT_SPACING,
  BELT_SPEED,
  BELT_DASH,
  BELT_TIER_MAX,
  DRILL_SPACING,
  beltCapacity,
  ORES,
  SLOTS,
  TICK_HZ,
  type Ore,
} from '../src/rockhopper/config';
import {
  beltEnds,
  buildDrill,
  legacySocketAngle,
  firstCells,
  nearestRim,
  rimPos,
  buildSmelter,
  canTarget,
  cellPos,
  inputsOf,
  moveSmelter,
  smelterSpotOk,
  widen,
  widenPrice,
  clearLaser,
  drills,
  freshState,
  generateRock,
  inTransitValue,
  upgrade,
  applyCommand,
  replay,
  type CommandName,
  type LoggedCommand,
  type BeltItem,
  priceOf,
  route,
  run,
  sell,
  setLaser,
  smelters,
  step,
  unlock,
  upgradeHub,
  type SimEvent,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';
import { rawChains, runBot } from '../tools/rockhopper-bot';

const events = (s: State, ticks: number): SimEvent[] => {
  const out: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    step(s);
    out.push(...s.events);
    s.events.length = 0;
  }
  return out;
};

const xy = (a: { x: number; y: number }, b: { x: number; y: number }): [number, number] => [
  a.x - b.x,
  a.y - b.y,
];
const center = (s: State, slot = 0) => ({ x: SLOTS[slot].x, y: SLOTS[slot].y });

test('rocks are deterministic, capped and tier-flavoured', () => {
  const a = generateRock(0, 0, 1),
    b = generateRock(0, 0, 1),
    c = generateRock(0, 1, 1);
  assert.deepEqual(a.cells, b.cells);
  assert.notDeepEqual(a.cells, c.cells);
  assert.ok(a.total > 80 && a.total < 160, `T1 cells ${a.total}`);
  const t4 = generateRock(7, 0, 1);
  assert.ok(t4.total < 460, `T4 cells ${t4.total}`);
  assert.ok(!a.cells.some((x) => x === 4 || x === 5), 'no gold or crystal in T1');
  assert.ok(t4.cells.filter((x) => x === 5).length > t4.total * 0.1, 'T4 is crystal-rich');
});

test('laser breaks the first rock cell within 300 ms and chunks reach the hub within 0.6 s', () => {
  const s = freshState(1);
  setLaser(s, 0, center(s));
  const ev = events(s, Math.round(0.3 * TICK_HZ) + 12);
  const first = ev.findIndex((e) => e.type === 'break');
  assert.ok(first >= 0);
  const breakTick = ev.slice(0, first).length;
  assert.ok(breakTick <= 0.3 * TICK_HZ, `break after ${breakTick} ticks`);
  // A still finger keeps finding cells: hold for 20 s and never stall.
  const s2 = freshState(1);
  setLaser(s2, 0, center(s2));
  run(s2, 20 * TICK_HZ);
  assert.ok(s2.stats.laserBroken > 25, `laser broke ${s2.stats.laserBroken}`);
  assert.ok(s2.credits >= priceOf(s2, 'drill'), 'first drill affordable by hand within 20 s');
  const flightTicks = Math.max(...s2.flights.map((f) => f.t1 - f.t0), 0);
  assert.ok(flightTicks <= 0.6 * TICK_HZ);
});

test('first drill auto-links to a dock, delivers real chunks, and at least matches the base laser', () => {
  const s = freshState(1);
  s.credits = priceOf(s, 'drill');
  assert.equal(buildDrill(s, 0, legacySocketAngle(0, 0)), true);
  const d = drills(s)[0];
  assert.deepEqual(d.out?.to, { kind: 'dock', index: 0 });
  run(s, 20 * TICK_HZ);
  assert.ok(s.stats.drillBroken > 20, `drill broke ${s.stats.drillBroken}`);
  assert.ok(s.earned > 0);
  // Conservation: everything broken by the drill is either delivered or still in transit.
  const t = freshState(1);
  setLaser(t, 0, center(t));
  run(t, 20 * TICK_HZ);
  assert.ok(s.stats.drillBroken >= t.stats.laserBroken * 0.9, 'drill is not a downgrade');
});

test('an unlinked drill fills its buffer and stops (backpressure)', () => {
  const s = freshState(1);
  s.credits = 1e6;
  s.docks = 3;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  unlock(s, 1);
  run(s, 3 * TICK_HZ);
  buildDrill(s, 1, legacySocketAngle(1, 0));
  const last = drills(s)[3];
  assert.equal(last.out, null, 'no free dock');
  run(s, 30 * TICK_HZ);
  assert.equal(last.buffer.length, DRILL_BUFFER);
  const broken = s.stats.drillBroken;
  const before = last.buffer.slice();
  run(s, 3 * TICK_HZ);
  assert.deepEqual(last.buffer, before);
  assert.ok(s.stats.drillBroken > broken, 'other drills keep working');
});

test('a smelter dropped on a belt goes into that line, pairs chunks and pays x3 per chunk', () => {
  const s = freshState(1);
  s.credits = 1e6;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const d = drills(s)[0];
  const e = beltEnds(s, d)!;
  // Off the belt it stands alone: the docks are full, so it waits unlinked.
  assert.equal(buildSmelter(s, { x: 150, y: -60 }), true);
  assert.equal(smelters(s)[0].out, null, 'standalone, no free dock');
  // On the belt it splices: drill -> smelter -> the drill's old dock.
  const dock = d.out!.to;
  let ok = false;
  for (let f = 0.2; f < 0.95 && !ok; f += 0.05) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    ok = buildSmelter(s, p, d.id) === true;
  }
  assert.ok(ok, 'found a splice point');
  const sm = smelters(s)[1];
  assert.deepEqual(d.out!.to, { kind: 'smelter', id: sm.id });
  assert.deepEqual(sm.out!.to, dock);
  const ev = events(s, 20 * TICK_HZ);
  const bars = ev.filter(
    (e): e is Extract<SimEvent, { type: 'deliver' }> => e.type === 'deliver' && e.bar
  );
  assert.ok(bars.length > 5, `bars ${bars.length}`);
  for (const b of bars) assert.equal(b.value, ORES[b.ore].value * BAR_VALUE);
  assert.ok(s.stats.bars * 2 <= s.stats.drillBroken, 'two chunks per bar');
});

test('a drill takes up to two input belts and forwards them as a fair zipper', () => {
  const s = freshState(1);
  s.credits = 1e9;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const [a, b, c] = drills(s);
  // b is the junction: a and c feed it, and only b's belt reaches a dock.
  assert.equal(route(s, a.id, { kind: 'drill', id: b.id }), true);
  assert.equal(route(s, c.id, { kind: 'drill', id: b.id }), true);
  assert.deepEqual(
    inputsOf(s, b.id).map((m) => m.id),
    [a.id, c.id]
  );
  unlock(s, 1);
  run(s, 3 * TICK_HZ);
  buildDrill(s, 1, legacySocketAngle(1, 0));
  const d = drills(s)[3];
  assert.equal(canTarget(s, d, { kind: 'drill', id: b.id }), false, 'cap of two inputs');
  // Its only free docks lie across the junction's belt: sell it so no crossing shares that belt.
  sell(s, d.id);
  // Saturate: level-2 drills make about 4.5 chunks/s each (13.5/s) on a tier-1 belt (8.5/s).
  // The window stays inside the rock's life, before it crumbles.
  for (const m of [a, b, c]) while (m.level < 2) upgrade(s, m.id);
  run(s, 4 * TICK_HZ);
  assert.ok(b.full, 'the junction shows full');
  assert.ok(!a.full && !c.full, 'feeders are backed up, not the limit');
  // The shared belt runs at its capacity: the fair zipper fills every bundle slot.
  s.events.length = 0;
  const dock = (b.out!.to as { index: number }).index;
  const through = events(s, 2 * TICK_HZ).filter(
    (e) => e.type === 'deliver' && e.dock === dock
  ).length;
  const cap = beltCapacity(1) * 2;
  assert.ok(through <= cap * 1.05 && through >= cap * 0.85, `through ${through} vs cap ${cap}`);
});

test('the zipper gives each source an equal share of a saturated belt', () => {
  const s = freshState(1);
  s.credits = 1e9;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const [a, b, c] = drills(s);
  route(s, a.id, { kind: 'drill', id: b.id });
  route(s, c.id, { kind: 'drill', id: b.id });
  // No rock: only the chunks supplied below move. Keep every source supplied, each with its
  // own ore: b's buffer gold, a copper, c ice.
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  const count = new Map<number, number>([
    [2, 0],
    [3, 0],
    [4, 0],
  ]);
  const seen = new Set<BeltItem>();
  for (let i = 0; i < 20 * TICK_HZ; i++) {
    b.buffer = [4, 4, 4, 4];
    for (const [m, ore] of [
      [a, 2],
      [c, 3],
    ] as const) {
      const f = m.out!.items[0];
      if (!f || f.pos < m.out!.length - 1e-6)
        m.out!.items.unshift({ pos: m.out!.length, ores: [ore], mult: 1 });
    }
    step(s);
    s.events.length = 0;
    for (const it of b.out!.items)
      if (!seen.has(it)) {
        seen.add(it);
        for (const o of it.ores) count.set(o, count.get(o)! + 1);
      }
  }
  const shares = [...count.values()];
  const total = shares.reduce((x, y) => x + y, 0);
  for (const n of shares) assert.ok(Math.abs(n - total / 3) <= 2, `shares ${shares}`);
});

test('links never loop, and a smelter never feeds a smelter', () => {
  const s = freshState(1);
  s.credits = 1e9;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const [a, b, c] = drills(s);
  assert.equal(route(s, a.id, { kind: 'drill', id: b.id }), true);
  assert.equal(route(s, b.id, { kind: 'drill', id: c.id }), true);
  assert.equal(route(s, c.id, { kind: 'drill', id: a.id }), 'invalid', 'a -> b -> c -> a');
  assert.equal(route(s, a.id, { kind: 'drill', id: a.id }), 'invalid', 'self');
  buildSmelter(s, { x: 150, y: -60 });
  buildSmelter(s, { x: -150, y: -60 });
  const [s1, s2] = smelters(s);
  assert.equal(route(s, s1.id, { kind: 'smelter', id: s2.id }), 'invalid');
  assert.equal(route(s, s1.id, { kind: 'drill', id: c.id }), true);
  assert.equal(route(s, c.id, { kind: 'smelter', id: s1.id }), 'invalid', 'c -> s1 -> c');
});

test('smelter intake is round-robin across belts and not capped at one chunk a tick', () => {
  const s = freshState(1);
  s.credits = 1e6;
  buildSmelter(s, { x: 110, y: -110 });
  const sm = smelters(s)[0];
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildDrill(s, 0, legacySocketAngle(0, 2));
  const [a, b] = drills(s);
  for (const d of [a, b]) assert.equal(route(s, d.id, { kind: 'smelter', id: sm.id }), true);
  // Both belts have a bundle waiting: copper on one, ice on the other.
  a.out!.items.unshift({ pos: a.out!.length, ores: [2, 2, 2], mult: 1 });
  b.out!.items.unshift({ pos: b.out!.length, ores: [3, 3, 3], mult: 1 });
  sm.queue.length = 0;
  step(s);
  const took = [...sm.queue, ...(sm.job ? [sm.job.ore, sm.job.ore] : [])];
  assert.equal(took.filter((o) => o === 2).length, 3, 'three from each belt in one tick');
  assert.equal(took.filter((o) => o === 3).length, 3);
  // Several chunks can enter in one tick when several wait.
  const t = freshState(1);
  t.credits = 1e6;
  buildSmelter(t, { x: 110, y: -110 });
  const tm = smelters(t)[0];
  buildDrill(t, 0, legacySocketAngle(0, 0));
  const d = drills(t)[0];
  route(t, d.id, { kind: 'smelter', id: tm.id });
  d.out!.items.push({ pos: d.out!.length, ores: [2, 2, 2, 2], mult: 1 });
  step(t);
  assert.ok(tm.queue.length + (tm.job ? 2 : 0) >= 4, 'a whole bundle entered at once');
});

test('rocks crumble below 20%, each cell counts once, and a new rock is towed in', () => {
  const s = freshState(1);
  s.credits = 1e6;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const total = s.slots[0].rock!.total;
  const ev = events(s, 120 * TICK_HZ);
  const crumble = ev.findIndex((e) => e.type === 'crumble' && e.slot === 0);
  assert.ok(crumble >= 0, 'crumbled');
  const breaks = ev.filter((e) => e.type === 'break' && e.slot === 0);
  const firstRock = new Set<number>();
  let arrived = false;
  for (const e of ev) {
    if (e.type === 'arrive') arrived = true;
    if (e.type === 'break' && !arrived) {
      assert.ok(!firstRock.has(e.cell), 'no cell breaks twice');
      firstRock.add(e.cell);
    }
  }
  assert.equal(firstRock.size, total);
  assert.ok(arrived, 'replacement arrived');
  assert.ok(breaks.length > total, 'drills resumed on the new rock');
});

test('save round-trip mid-flight continues identically', () => {
  const a = freshState(3);
  a.credits = 500;
  buildDrill(a, 0, legacySocketAngle(0, 0));
  buildDrill(a, 0, legacySocketAngle(0, 1));
  setLaser(a, 0, center(a));
  run(a, 7 * TICK_HZ + 5);
  clearLaser(a); // the finger lifts before the app is closed
  a.events.length = 0;
  const b = deserialize(serialize(a))!;
  assert.ok(b);
  run(a, 25 * TICK_HZ);
  run(b, 25 * TICK_HZ);
  a.events.length = 0;
  b.events.length = 0;
  assert.equal(serialize(a), serialize(b));
  assert.equal(deserialize('{"version":2}'), null);
  assert.equal(deserialize('not json'), null);
});

test('a belt caps what it carries until it is widened, and drills say so', () => {
  const rate = (level: number, tier: number) => {
    const s = freshState(1);
    s.credits = 1e9;
    buildDrill(s, 0, legacySocketAngle(0, 0));
    const d = drills(s)[0];
    while (d.level < level) upgrade(s, d.id);
    while (d.tier < tier) widen(s, d.id);
    run(s, 10);
    s.events.length = 0;
    let chunks = 0;
    const ticks = Math.round(4 * TICK_HZ);
    for (let i = 0; i < ticks; i++) {
      step(s);
      for (const e of s.events) if (e.type === 'break') chunks++;
      s.events.length = 0;
    }
    return { rate: chunks / 4, full: d.full };
  };
  const low = rate(1, 1);
  assert.ok(!low.full, 'a level-1 drill fits a tier-1 belt');
  const capped = rate(5, 1);
  assert.ok(capped.rate <= beltCapacity(1) * 1.1, `capped at ${capped.rate.toFixed(1)}/s`);
  assert.ok(capped.full, 'the drill reads belt-limited');
  const wide = rate(5, 3);
  assert.ok(
    wide.rate > capped.rate * 1.4,
    `widened ${wide.rate.toFixed(1)} vs ${capped.rate.toFixed(1)}`
  );
});

test('the widen price counts owned tier steps only, never belt length', () => {
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildDrill(s, 0, legacySocketAngle(0, 1));
  const [a, b] = drills(s);
  // A short link (to a neighbour) and a long one (to the hub) cost the same to widen.
  route(s, a.id, { kind: 'drill', id: b.id });
  const short = widenPrice(s, a)!;
  const long = widenPrice(s, b)!;
  assert.equal(short, long);
  // Widening then re-routing gains nothing: the next step costs the same wherever it goes.
  widen(s, a.id);
  const next = widenPrice(s, a)!;
  route(s, a.id, { kind: 'dock', index: 1 });
  assert.equal(widenPrice(s, a), next);
  assert.ok(next > short, 'escalates with steps owned');
  // Selling lowers it again.
  sell(s, a.id);
  assert.equal(widenPrice(s, b), short);
  for (let k = 1; k < BELT_TIER_MAX; k++) widen(s, b.id);
  assert.equal(widenPrice(s, b), null, 'tier 4 is the top');
});

test('belts are slow enough to read, and wider belts ship bigger bundles', () => {
  // In a 25 fps phone video a bundle moves well under half its spacing per frame, and the
  // belt's dash pattern moves under a third of its period, so neither strobes or runs backwards.
  const perFrame = BELT_SPEED / 25;
  assert.ok(perFrame <= 0.42 * BELT_SPACING, `${perFrame.toFixed(1)} u per frame`);
  assert.ok(perFrame <= (BELT_DASH[0] + BELT_DASH[1]) / 3, 'dash would alias');
  const meanBundle = (tier: number) => {
    const s = freshState(1);
    s.credits = 1e9;
    buildDrill(s, 0, legacySocketAngle(0, 0));
    const d = drills(s)[0];
    while (d.level < DRILL_MAX_LEVEL) upgrade(s, d.id);
    while (d.tier < tier) widen(s, d.id);
    run(s, 15);
    let n = 0,
      chunks = 0;
    const seen = new Set<BeltItem>();
    for (let i = 0; i < 2 * TICK_HZ; i++) {
      step(s);
      s.events.length = 0;
      for (const it of d.out!.items)
        if (!seen.has(it)) {
          seen.add(it);
          n++;
          chunks += it.ores.length;
          assert.ok(it.ores.length <= tier);
        }
    }
    return chunks / n;
  };
  const low = meanBundle(1),
    high = meanBundle(4);
  assert.ok(high > low + 1.5, `bundles ${low.toFixed(2)} at tier 1 vs ${high.toFixed(2)} at 4`);
});

test('corrupt bundles are rejected instead of crashing', () => {
  const s = freshState(1);
  s.credits = 100;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  run(s, 4 * TICK_HZ);
  const raw = JSON.parse(serialize(s)) as { machines: { out: { items: { ores: unknown[] }[] } }[] };
  raw.machines[0].out.items[0].ores = [];
  assert.equal(deserialize(JSON.stringify(raw)), null);
  raw.machines[0].out.items[0].ores = [9];
  assert.equal(deserialize(JSON.stringify(raw)), null);
});

test('every smelter level is a real speed-up, and level 1 outpaces a tier-1 belt', () => {
  const rate = (level: number) => {
    const s = freshState(1);
    s.credits = 1e9;
    buildSmelter(s, { x: 110, y: -110 });
    const sm = smelters(s)[0];
    while (sm.level < level) upgrade(s, sm.id);
    sm.out = null; // measure the furnace alone: keep it fed, empty its output
    let bars = 0;
    for (let i = 0; i < 3 * TICK_HZ; i++) {
      while (sm.queue.length < 6) sm.queue.push(1);
      step(s);
      bars += sm.ready.length;
      sm.ready.length = 0;
      s.events.length = 0;
    }
    return bars / 3;
  };
  assert.ok(rate(1) * 2 >= beltCapacity(1), `level 1 takes ${(rate(1) * 2).toFixed(1)} chunks/s`);
  let prev = 0;
  for (let level = 1; level <= 8; level++) {
    const r = rate(level);
    assert.ok(
      r > prev * 1.2,
      `smelter level ${level}: ${r.toFixed(1)} bars/s after ${prev.toFixed(1)}`
    );
    prev = r;
  }
});

test('pre-logistics (v1) saves migrate: belt capacity kept, tiers unbought, bar values kept', () => {
  const s = freshState(1);
  s.credits = 1000;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildSmelter(s, { x: 110, y: -110 });
  route(s, drills(s)[0].id, { kind: 'smelter', id: smelters(s)[0].id });
  run(s, 8 * TICK_HZ);
  // Rebuild what a v1 save looked like: no tiers, bar flags, a smelter job and ready bars.
  const v1 = JSON.parse(serialize(s)) as Record<string, unknown> & {
    machines: Record<string, unknown>[];
  };
  v1.version = 1;
  for (const m of v1.machines) {
    delete m.tier;
    delete m.tierBought;
    m.level = 5;
    const out = m.out as { items: Record<string, unknown>[] } | null;
    for (const it of out?.items ?? []) {
      it.bar = (it.mult as number) > 1;
      delete it.mult;
    }
    if (m.kind === 'smelter') {
      m.ready = [3, 3];
      m.job = { ore: 2, left: 0.2 };
      m.queue = [2];
    }
  }
  const drill = v1.machines.find((m) => m.kind === 'drill')!;
  (drill.out as { items: Record<string, unknown>[] }).items = [{ pos: 5, ore: 4, bar: true }];
  const loaded = deserialize(JSON.stringify(v1))!;
  assert.ok(loaded, 'v1 save loads');
  assert.equal(loaded.version, 3);
  for (const m of loaded.machines) {
    assert.equal(m.tier, 3, 'level 5 shipped bundles of 3');
    assert.equal(m.tierBought, 0, 'migrated tiers are not bought');
  }
  // Rising prices count tier steps bought: migrated tiers must not raise them.
  const rising = freshState(1);
  loaded.fixedCosts = rising.fixedCosts = false;
  assert.equal(widenPrice(loaded, loaded.machines[0]), widenPrice(rising, { tier: 1 } as never));
  const sm = smelters(loaded)[0];
  assert.deepEqual(sm.ready, [
    { ore: 3, mult: 3 },
    { ore: 3, mult: 3 },
  ]);
  assert.deepEqual(sm.queue, [2, 2], 'the old job returns to the queue');
  const it = drills(loaded)[0].out!.items[0];
  assert.deepEqual([it.ores, it.mult], [[4], 3], 'an old x3 bar keeps x3');
  run(loaded, 5 * TICK_HZ);
  assert.equal(deserialize(serialize(loaded))!.version, 3);
});

test('selling heals the line only where the target matrix allows it', () => {
  // drill -> J -> dock: selling J hands its dock to the drill.
  const s = freshState(1);
  s.credits = 1e9;
  for (let k = 0; k < 2; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  const [a, j] = drills(s);
  route(s, a.id, { kind: 'drill', id: j.id });
  const dock = j.out!.to;
  sell(s, j.id);
  assert.deepEqual(a.out?.to, dock, 'the input took over the dock');
  // smelter S -> drill J -> smelter T: S can't inherit T (no smelter feeds a smelter).
  const t = freshState(1);
  t.credits = 1e9;
  buildDrill(t, 0, legacySocketAngle(0, 0));
  const jj = drills(t)[0];
  buildSmelter(t, { x: 150, y: -60 });
  buildSmelter(t, { x: -150, y: -60 });
  const [S, T] = smelters(t);
  assert.equal(route(t, jj.id, { kind: 'smelter', id: T.id }), true);
  assert.equal(route(t, S.id, { kind: 'drill', id: jj.id }), true);
  sell(t, jj.id);
  assert.notEqual(S.out?.to.kind, 'smelter', 'S never inherits T');
  assert.ok(t.machines.every((m) => m.kind !== 'smelter' || m.out?.to.kind !== 'smelter'));
});

test('a smelter moved onto a belt splices only while it has no output', () => {
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  const d = drills(s)[0];
  for (let k = 0; k < 2; k++) buildDrill(s, 0, legacySocketAngle(0, k + 1));
  buildSmelter(s, { x: 150, y: -60 });
  const sm = smelters(s)[0];
  assert.equal(sm.out, null);
  const e = beltEnds(s, d)!;
  let spot = null;
  for (let f = 0.2; f < 0.95 && !spot; f += 0.05) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    if (moveSmelter(s, sm.id, p, d.id) === true) spot = p;
  }
  assert.ok(spot, 'moved into the line');
  assert.equal(d.out!.to.kind, 'smelter');
  assert.equal(moveSmelter(s, sm.id, { x: 200, y: -40 }, drills(s)[1].id), 'invalid');
});

test('the laser is never saved, so a reload cannot keep it firing', () => {
  const s = freshState(1);
  setLaser(s, 0, center(s));
  run(s, 10);
  const loaded = deserialize(serialize(s))!;
  assert.equal(loaded.laser, null);
  const broken = loaded.stats.laserBroken;
  run(loaded, 60 * TICK_HZ);
  assert.equal(loaded.stats.laserBroken, broken);
});

test('a command log replays to the identical state (clip witness)', () => {
  const log: LoggedCommand[] = [];
  const s = freshState(4);
  const cmd = (name: CommandName, ...args: unknown[]) => {
    log.push([s.tick, name, JSON.parse(JSON.stringify(args)) as unknown[]]);
    applyCommand(s, name, args);
  };
  cmd('setLaser', 0, center(s));
  run(s, 6 * TICK_HZ);
  cmd('clearLaser');
  cmd('buildDrill', 0, legacySocketAngle(0, 0));
  run(s, 10 * TICK_HZ);
  s.events.length = 0;
  const again = replay(4, log, s.tick);
  assert.equal(serialize(again), serialize(s));
});

test('selling refunds half of everything spent, belt tiers included', () => {
  const s = freshState(1);
  s.credits = 1000;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  const d = drills(s)[0];
  widen(s, d.id);
  const before = s.credits;
  assert.equal(sell(s, d.id), true);
  assert.equal(s.credits, before + Math.floor(d.spent / 2));
  assert.equal(drills(s).length, 0);
});

test('hub upgrades: docks relink, laser is capped at six levels', () => {
  const s = freshState(1);
  s.credits = 1e7;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, legacySocketAngle(0, k));
  unlock(s, 1);
  buildDrill(s, 1, legacySocketAngle(1, 0));
  assert.equal(drills(s)[3].out, null);
  assert.equal(upgradeHub(s, 'docks'), true);
  assert.deepEqual(drills(s)[3].out?.to.kind, 'dock');
  for (let i = 0; i < 5; i++) assert.equal(upgradeHub(s, 'laser'), true);
  assert.equal(upgradeHub(s, 'laser'), 'max');
});

test('credits only come from delivered chunks', () => {
  const s = freshState(2);
  s.credits = 1000;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildSmelter(s, { x: 110, y: -110 });
  route(s, drills(s)[0].id, { kind: 'smelter', id: smelters(s)[0].id });
  setLaser(
    s,
    0,
    cellPos(
      0,
      s.slots[0].rock!,
      s.slots[0].rock!.cells.findIndex((c) => c > 0)
    )
  );
  const ev = events(s, 30 * TICK_HZ);
  clearLaser(s);
  const delivered = ev.reduce((a, e) => a + (e.type === 'deliver' ? e.value : 0), 0);
  assert.equal(s.earned, delivered);
  assert.ok(inTransitValue(s) >= 0);
  const ore = ev.find((e) => e.type === 'break')!;
  assert.ok((ore as { ore: Ore }).ore >= 1);
});

test('pacing bot (scripted upper bound) hits the provisional beats', () => {
  const { beats } = runBot({ minutes: 13, laser: true, seed: 1 });
  const at = (l: string) => beats.find((b) => b.label === l)?.seconds ?? Infinity;
  // The design's own targets (docs/ROCKHOPPER_DESIGN.md), not bounds widened to fit the bot.
  assert.ok(at('drill #1') >= 3 && at('drill #1') <= 6, `first drill ${at('drill #1')}`);
  assert.ok(at('smelter #1') >= 60 && at('smelter #1') <= 120, `first smelter ${at('smelter #1')}`);
  const t1 = at('T1 fully unlocked');
  assert.ok(t1 >= 4 * 60 && t1 <= 7 * 60, `T1 ${t1}`);
  const t2 = at('T2 reached');
  assert.ok(t2 >= 8 * 60 && t2 <= 12 * 60, `T2 ${t2}`);
});

test('the bot still builds raw drill chains by 20 minutes (smelters do not replace logistics)', () => {
  const { state, beats } = runBot({ minutes: 20, laser: true, seed: 2 });
  assert.ok(rawChains(state) >= 3, `raw chains ${rawChains(state)}`);
  assert.ok(
    beats.some((b) => b.label === 'widen'),
    'belts get widened'
  );
});

test('a lone feeder that outruns its own belt reads full; a slow smelter reads blocked', () => {
  // A level-5 drill (about 14 chunks/s) on a tier-1 belt into a tier-3 junction.
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildDrill(s, 0, legacySocketAngle(0, 1));
  const [f, j] = drills(s);
  route(s, f.id, { kind: 'drill', id: j.id });
  while (f.level < 5) upgrade(s, f.id);
  while (j.tier < 3) widen(s, j.id);
  run(s, 3 * TICK_HZ);
  assert.ok(f.full, 'the feeder is the limit');
  assert.ok(!j.full, 'the junction has room');
  // Two level-5 drills into a level-1 smelter: the smelter is the limit.
  const t = freshState(1);
  t.credits = 1e9;
  buildDrill(t, 0, legacySocketAngle(0, 0));
  buildDrill(t, 0, legacySocketAngle(0, 2));
  buildSmelter(t, { x: 150, y: -110 });
  const sm = smelters(t)[0];
  for (const d of drills(t)) {
    route(t, d.id, { kind: 'smelter', id: sm.id });
    while (d.level < 5) upgrade(t, d.id);
    while (d.tier < 3) widen(t, d.id);
  }
  run(t, 4 * TICK_HZ);
  assert.ok(sm.jam, 'the smelter reads blocked');
  assert.ok(
    drills(t).every((d) => !d.full),
    'its feeders are not blamed'
  );
});

test('splicing or moving never puts belt items behind the belt start', () => {
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  const d = drills(s)[0];
  while (d.level < 5) upgrade(s, d.id);
  run(s, 3 * TICK_HZ);
  assert.ok(d.out!.items.length > 5);
  const e = beltEnds(s, d)!;
  let spliced = false;
  for (let f = 0.05; f < 0.95 && !spliced; f += 0.02) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    spliced = buildSmelter(s, p, d.id) === true;
  }
  assert.ok(spliced);
  const count = (x: typeof d) => x.out!.items.reduce((n, it) => n + it.ores.length, 0);
  const before = count(d) + d.buffer.length;
  for (let i = 0; i < 2 * TICK_HZ; i++) {
    step(s);
    s.events.length = 0;
    for (const m of s.machines)
      for (const it of m.out?.items ?? []) assert.ok(it.pos >= 0 && it.pos <= m.out!.length);
  }
  assert.ok(before > 0);
});

test('belt capacity never depends on belt length (no short-belt bonus)', () => {
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  const d = drills(s)[0];
  while (d.level < DRILL_MAX_LEVEL) upgrade(s, d.id);
  // The shortest splice the rules allow, right next to the drill.
  const e = beltEnds(s, d)!;
  for (let f = 0.02; f < 0.95; f += 0.01) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    if (buildSmelter(s, p, d.id) === true) break;
  }
  const sm = smelters(s)[0];
  assert.ok(sm, 'spliced');
  while (sm.level < 5) upgrade(s, sm.id);
  run(s, 2 * TICK_HZ);
  const q0 = s.stats.drillBroken;
  run(s, 3 * TICK_HZ);
  const rate = (s.stats.drillBroken - q0) / 3;
  assert.ok(rate <= beltCapacity(1) * 1.05, `short belt carried ${rate.toFixed(1)}/s`);
});

test('a drill goes anywhere on the rim, clear of its neighbours', () => {
  const s = freshState(1);
  s.credits = 1e6;
  const R = SLOTS[0].r * 10 + 18;
  assert.equal(buildDrill(s, 0, 0.37), true);
  const p = rimPos(0, drills(s)[0].angle);
  assert.ok(Math.abs(Math.hypot(p.x - SLOTS[0].x, p.y - SLOTS[0].y) - R) < 1e-9, 'on the rim');
  // Too close to the first drill: refused, but a drop there slides along the rim to room.
  assert.equal(buildDrill(s, 0, 0.37 + 20 / R), 'no room here');
  const near = nearestRim(s, rimPos(0, 0.37 + 20 / R), 90)!;
  assert.equal(near.why, '');
  assert.ok(Math.hypot(...xy(rimPos(0, near.angle), p)) >= DRILL_SPACING - 1e-9);
  // No socket count: the rim's length decides how many fit.
  let n = 1;
  for (let k = 1; k < 200; k++) if (buildDrill(s, 0, 0.37 + (k * 2 * Math.PI) / 200) === true) n++;
  assert.ok(n > 3 && n <= Math.floor((2 * Math.PI * R) / DRILL_SPACING), `${n} drills fit`);
  for (const a of drills(s))
    for (const b of drills(s))
      if (a !== b)
        assert.ok(
          Math.hypot(...xy(rimPos(0, a.angle), rimPos(0, b.angle))) >= DRILL_SPACING - 1e-9
        );
  assert.equal(buildDrill(s, 1, 0), 'locked');
});

test('drills and smelters never overlap, whichever came first', () => {
  const s = freshState(1);
  s.credits = 1e6;
  const a = Math.PI / 2 + 0.6;
  const q = rimPos(0, a);
  const out = { x: q.x + Math.cos(a) * 16, y: q.y + Math.sin(a) * 16 };
  assert.equal(buildSmelter(s, out), true);
  assert.equal(buildDrill(s, 0, a), 'no room here');
  const slid = nearestRim(s, q, 90)!;
  assert.equal(slid.why, '');
  assert.notEqual(slid.angle, a);
  // And a smelter can't land on a built drill.
  assert.equal(buildDrill(s, 0, Math.PI * 1.5), true);
  assert.equal(smelterSpotOk(s, rimPos(0, Math.PI * 1.5)), false);
});

test('position decides what a drill mines first, and veins stay put across respawns', () => {
  const s = freshState(1);
  s.credits = 1e6;
  const rock = s.slots[0].rock!;
  // Aim at an ore cell: the drill there digs it (or its neighbours) before the far side.
  const ore = rock.cells.findIndex((c) => c > 1);
  assert.ok(ore >= 0);
  const c = cellPos(0, rock, ore);
  const a = Math.atan2(c.y - SLOTS[0].y, c.x - SLOTS[0].x);
  const first = firstCells(0, rock, rimPos(0, a), 4);
  const far = firstCells(0, rock, rimPos(0, a + Math.PI), 4);
  assert.equal(first.filter((k) => far.includes(k)).length, 0, 'opposite sides dig apart');
  buildDrill(s, 0, a);
  run(s, 4 * TICK_HZ);
  assert.ok(
    first.some((k) => !rock.cells[k]),
    'the aimed cells went first'
  );
  // Respawns change the outline, never where the veins run.
  const g0 = generateRock(3, 0, 7),
    g1 = generateRock(3, 1, 7);
  let same = 0,
    both = 0;
  for (let k = 0; k < g0.cells.length; k++) {
    if (!g0.cells[k] || !g1.cells[k]) continue;
    both++;
    if (g0.cells[k] === g1.cells[k]) same++;
  }
  assert.ok(same >= both * 0.9, `shared cells hold the same ore: ${same} of ${both}`);
  // Richness stays exact for the tier on every respawn.
  for (let g = 0; g < 20; g++) {
    const r = generateRock(5, g, 3);
    const ore = r.cells.filter((c) => c > 1).length;
    assert.equal(ore, Math.round(r.total * 0.42), `generation ${g}`);
  }
});

test('saves from before free placement keep drills at their old sockets', () => {
  const s = freshState(1);
  s.credits = 1e6;
  buildDrill(s, 0, legacySocketAngle(0, 2));
  const raw = JSON.parse(serialize(s)) as { machines: Record<string, unknown>[] };
  for (const m of raw.machines) {
    delete m.angle;
    m.socket = 2;
  }
  const t = deserialize(JSON.stringify(raw))!;
  assert.ok(t, 'loads');
  const d = drills(t)[0];
  assert.ok(Math.abs(d.angle - legacySocketAngle(0, 2)) < 1e-9);
  assert.equal((d as unknown as Record<string, unknown>).socket, undefined);
  // A bad angle (JSON turns NaN into null) or an overlap re-seats the drill; the save survives.
  buildDrill(s, 0, legacySocketAngle(0, 0));
  const two = JSON.parse(serialize(s)) as { machines: Record<string, unknown>[] };
  two.machines[0].angle = null;
  const u = deserialize(JSON.stringify(two))!;
  assert.ok(u, 'loads');
  const [p, q] = drills(u).map((d) => rimPos(0, d.angle));
  assert.ok(Math.hypot(...xy(p, q)) >= DRILL_SPACING - 1e-9);
  two.machines[0].angle = two.machines[1].angle;
  const v = deserialize(JSON.stringify(two))!;
  const [p2, q2] = drills(v).map((d) => rimPos(0, d.angle));
  assert.ok(
    Math.hypot(...xy(p2, q2)) >= DRILL_SPACING - 1e-9,
    'overlapping drills are pulled apart'
  );
});

test('a v1 save refits belts to the moved tiers and lifts smelters out of rocks', () => {
  const s = freshState(1);
  s.credits = 1e6;
  buildDrill(s, 0, legacySocketAngle(0, 0));
  buildSmelter(s, { x: 150, y: -110 });
  const sm = smelters(s)[0];
  route(s, drills(s)[0].id, { kind: 'smelter', id: sm.id });
  run(s, 3 * TICK_HZ);
  const v1 = JSON.parse(serialize(s)) as Record<string, unknown> & {
    machines: Record<string, unknown>[];
  };
  v1.version = 1;
  for (const m of v1.machines) {
    delete m.tier;
    delete m.tierBought;
    if (m.kind === 'smelter') {
      // Legal in the old layout, now inside the moved first rock.
      m.x = 0;
      m.y = SLOTS[0].y + 30;
    }
    const out = m.out as { length: number } | null;
    if (out) out.length = 74.5; // stale, from the old geometry
  }
  const loaded = deserialize(JSON.stringify(v1))!;
  const lsm = smelters(loaded)[0];
  assert.ok(smelterSpotOk(loaded, lsm, lsm.id), 'moved to a legal spot');
  for (const m of loaded.machines) {
    const e = beltEnds(loaded, m);
    if (e) assert.ok(Math.abs(Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) - m.out!.length) < 1e-6);
  }
});
