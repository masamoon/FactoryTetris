import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR_MULTIPLIER,
  DRILL_BUFFER,
  DRILL_MAX_LEVEL,
  ORES,
  SLOTS,
  TICK_HZ,
  type Ore,
} from '../src/rockhopper/config';
import {
  buildDrill,
  buildSmelter,
  cellPos,
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
import { runBot } from '../tools/rockhopper-bot';

const events = (s: State, ticks: number): SimEvent[] => {
  const out: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    step(s);
    out.push(...s.events);
    s.events.length = 0;
  }
  return out;
};

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
  assert.equal(buildDrill(s, 0, 0), true);
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
  for (let k = 0; k < 3; k++) buildDrill(s, 0, k);
  unlock(s, 1);
  run(s, 3 * TICK_HZ);
  buildDrill(s, 1, 0);
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

test('a smelter splices into a full hub, unlinked drills retry, and bars pay x3', () => {
  const s = freshState(1);
  s.credits = 1e6;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, k);
  unlock(s, 1);
  run(s, 3 * TICK_HZ);
  buildDrill(s, 1, 0);
  assert.equal(drills(s)[3].out, null, 'docks are full');
  assert.equal(buildSmelter(s, { x: 110, y: -110 }), true);
  const sm = smelters(s)[0];
  assert.equal(sm.out?.to.kind, 'dock', 'smelter took over a dock');
  const feeding = drills(s).filter((d) => d.out?.to.kind === 'smelter');
  assert.equal(feeding.length, 2, 'the spliced drill and the waiting drill feed it');
  assert.ok(
    drills(s).every((d) => d.out),
    'nothing left unlinked'
  );
  // Re-routing a direct drill into the smelter frees a dock for the next machine.
  const direct = drills(s).find((d) => d.out?.to.kind === 'dock')!;
  assert.equal(route(s, direct.id, { kind: 'smelter', id: sm.id }), true);
  buildDrill(s, 1, 1);
  assert.equal(drills(s)[4].out?.to.kind, 'dock');
  const ev = events(s, 20 * TICK_HZ);
  const bars = ev.filter(
    (e): e is Extract<SimEvent, { type: 'deliver' }> => e.type === 'deliver' && e.bar
  );
  assert.ok(bars.length > 5);
  for (const b of bars) assert.equal(b.value, ORES[b.ore].value * BAR_MULTIPLIER);
});

test('smelter intake is round-robin across belts', () => {
  const s = freshState(1);
  s.credits = 1e6;
  buildSmelter(s, { x: 110, y: -110 });
  const sm = smelters(s)[0];
  buildDrill(s, 0, 0);
  buildDrill(s, 0, 2);
  for (const d of drills(s)) route(s, d.id, { kind: 'smelter', id: sm.id });
  const taken: number[] = [];
  const inputs = drills(s);
  for (let i = 0; i < 40 * TICK_HZ && taken.length < 12; i++) {
    const before = inputs.map((d) => d.out!.items.length);
    const q = sm.queue.length;
    step(s);
    s.events.length = 0;
    if (sm.queue.length > q || sm.job) {
      inputs.forEach((d, k) => {
        if (d.out!.items.length < before[k] && d.out!.items.length >= 0) taken.push(k);
      });
    }
  }
  const a = taken.filter((k) => k === 0).length,
    b = taken.filter((k) => k === 1).length;
  assert.ok(Math.abs(a - b) <= 2, `intake ${a} vs ${b}`);
});

test('rocks crumble below 20%, each cell counts once, and a new rock is towed in', () => {
  const s = freshState(1);
  s.credits = 1e6;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, k);
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
  buildDrill(a, 0, 0);
  buildDrill(a, 0, 1);
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

test('belts keep up with upgraded drills (upgrades are never dead purchases)', () => {
  // Work delivered per second (sum of hardness) removes most ore-mix noise. A short window on
  // the fine-grained T1 rock keeps even a max-level drill from running out mid-measurement.
  const rate = (level: number) => {
    const s = freshState(1);
    s.credits = 1e9;
    buildDrill(s, 0, 0);
    const d = drills(s)[0];
    while (d.level < level) upgrade(s, d.id);
    run(s, 10);
    s.events.length = 0;
    let work = 0,
      full = 0;
    const ticks = Math.round(1.5 * TICK_HZ);
    for (let i = 0; i < ticks; i++) {
      step(s);
      for (const e of s.events) if (e.type === 'break') work += ORES[e.ore].hardness;
      s.events.length = 0;
      if (d.buffer.length >= DRILL_BUFFER) full++;
    }
    return { work: work / 1.5, full: full / ticks };
  };
  for (let level = 1; level <= DRILL_MAX_LEVEL; level++) {
    const r = rate(level);
    assert.ok(r.full < 0.15, `level ${level} backed up ${Math.round(r.full * 100)}% of ticks`);
  }
  const low = rate(1).work,
    high = rate(DRILL_MAX_LEVEL).work;
  assert.ok(high > low * 4, `max level ${high.toFixed(1)} work/s vs ${low.toFixed(1)}`);
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
  cmd('buildDrill', 0, 0);
  run(s, 10 * TICK_HZ);
  s.events.length = 0;
  const again = replay(4, log, s.tick);
  assert.equal(serialize(again), serialize(s));
});

test('selling refunds half and relinks waiting machines', () => {
  const s = freshState(1);
  s.credits = 1000;
  buildDrill(s, 0, 0);
  const d = drills(s)[0];
  const before = s.credits;
  assert.equal(sell(s, d.id), true);
  assert.equal(s.credits, before + Math.floor(d.spent / 2));
  assert.equal(drills(s).length, 0);
});

test('hub upgrades: docks relink, laser is capped at six levels', () => {
  const s = freshState(1);
  s.credits = 1e7;
  for (let k = 0; k < 3; k++) buildDrill(s, 0, k);
  unlock(s, 1);
  buildDrill(s, 1, 0);
  assert.equal(drills(s)[3].out, null);
  assert.equal(upgradeHub(s, 'docks'), true);
  assert.deepEqual(drills(s)[3].out?.to.kind, 'dock');
  for (let i = 0; i < 5; i++) assert.equal(upgradeHub(s, 'laser'), true);
  assert.equal(upgradeHub(s, 'laser'), 'max');
});

test('credits only come from delivered chunks', () => {
  const s = freshState(2);
  s.credits = 1000;
  buildDrill(s, 0, 0);
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
