import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_VALUE, COPPER, CRYSTAL, SLOTS, TICK_HZ, type Ore } from '../src/rockhopper/config';
import {
  alloyOf,
  buildDrill,
  buildFactory,
  buildSmelter,
  byId,
  factoryUnlocked,
  freshState,
  LONE_WAIT,
  moveSmelter,
  route,
  sell,
  setFactories,
  smelterSpotOk,
  step,
  targetWhy,
  upgradeHub,
  widen,
  type Factory,
  type Machine,
  type Point,
  type SimEvent,
  type Smelter,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

const ICE = 3 as Ore;
const GOLD = 4 as Ore;
const ROCK = 1 as Ore;

/** Every slot open, deep pockets, all docks, factories switched on. */
function rich(crossings = false): State {
  const s = freshState(5);
  s.slots.forEach((x) => (x.unlocked = true));
  s.credits = 1e12;
  s.crossings = crossings;
  setFactories(s, true);
  while (upgradeHub(s, 'docks') === true);
  return s;
}

/** The first free spot for a smelter or factory, scanning outward from `from`. */
function spot(s: State, from: Point = { x: 0, y: -120 }): Point {
  for (let r = 0; r < 400; r += 10)
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const p = { x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r };
      if (smelterSpotOk(s, p)) return p;
    }
  throw new Error('no spot');
}

const last = (s: State) => s.machines[s.machines.length - 1];

function smelter(s: State, at?: Point): Smelter {
  assert.equal(buildSmelter(s, spot(s, at)), true);
  return last(s) as Smelter;
}

function factory(s: State, at?: Point): Factory {
  assert.equal(buildFactory(s, spot(s, at)), true);
  return last(s) as Factory;
}

function drillOn(s: State, i: number): Machine {
  for (let a = 0; a < Math.PI * 2; a += 0.02) if (buildDrill(s, i, a) === true) return last(s);
  throw new Error(`no room on slot ${i}`);
}

/** Put an item at the very front of `m`'s belt, as if it had just arrived at the far end. */
function arrive(m: Machine, ore: Ore, mult = BAR_VALUE, extra: { alloy?: Ore; v?: number } = {}) {
  m.out!.items.unshift({ pos: m.out!.length, ores: [ore], mult, ...extra });
}

/** Run until `until` holds or `max` seconds pass; returns the deliver events seen. */
function runFor(s: State, seconds: number) {
  const seen: SimEvent[] = [];
  for (let t = 0; t < seconds * TICK_HZ; t++) {
    s.events = [];
    step(s);
    seen.push(...s.events);
  }
  return seen.filter((e): e is Extract<SimEvent, { type: 'deliver' }> => e.type === 'deliver');
}

/** Two smelters feeding one factory on a dock. */
function line() {
  const s = rich();
  const a = smelter(s, { x: -120, y: -120 });
  const b = smelter(s, { x: 120, y: -120 });
  const f = factory(s, { x: 0, y: -200 });
  assert.equal(f.out?.to.kind, 'dock');
  assert.equal(route(s, a.id, { kind: 'factory', id: f.id }), true);
  assert.equal(route(s, b.id, { kind: 'factory', id: f.id }), true);
  return { s, a, b, f };
}

test('copper and crystal bars make one premium alloy worth 2.5x both bars', () => {
  const { s, a, b } = line();
  arrive(a, COPPER);
  arrive(b, CRYSTAL);
  const got = runFor(s, 30);
  assert.equal(got.length, 1, 'two bars in, one alloy out');
  assert.equal(got[0].value, 495);
  assert.equal(got[0].alloy, CRYSTAL);
  assert.equal(got[0].ore, COPPER);
  assert.equal(s.stats.delivered, 1);
});

test('other pairs make 1.25x alloys; same-ore bars wait and then pass on as bars', () => {
  const { s, a, b, f } = line();
  arrive(a, ICE);
  arrive(b, GOLD);
  let got = runFor(s, 30);
  assert.deepEqual(
    got.map((e) => e.value),
    [Math.floor(1.25 * BAR_VALUE * (5 + 12))]
  );
  // Two copper bars never pair: each waits LONE_WAIT and then goes on at bar value.
  arrive(a, COPPER);
  arrive(b, COPPER);
  runFor(s, LONE_WAIT * 0.5);
  assert.equal(f.stock.length, 2, 'lone bars wait for a partner');
  got = runFor(s, 30);
  assert.deepEqual(
    got.map((e) => [e.value, e.alloy]),
    [
      [18, undefined],
      [18, undefined],
    ]
  );
});

test('an arriving copper bar picks crystal over an older partner', () => {
  const { s, a, f } = line();
  f.stock.push(
    { ore: ICE, mult: BAR_VALUE, t: s.tick },
    { ore: CRYSTAL, mult: BAR_VALUE, t: s.tick }
  );
  arrive(a, COPPER);
  const got = runFor(s, 30);
  assert.ok(
    got.some((e) => e.value === 495),
    'copper paired with crystal'
  );
  assert.ok(
    got.some((e) => e.value === 30 && e.alloy === undefined),
    'ice passed on alone'
  );
});

test('rock bars, x3 bars, raw chunks and alloys pass straight through at their value', () => {
  const { s, a, b } = line();
  arrive(a, ROCK);
  arrive(b, GOLD, 3);
  arrive(a, ICE, 1);
  arrive(b, GOLD, BAR_VALUE, { alloy: CRYSTAL, v: 315 });
  const got = runFor(s, 30);
  assert.deepEqual(
    got.map((e) => e.value).sort((x, y) => x - y),
    [5, 6, 36, 315]
  );
});

test('an alloy passed through a drill junction and a smelter delivers exactly its value', () => {
  const s = rich();
  const a = smelter(s, { x: -120, y: -120 });
  const b = smelter(s, { x: 120, y: -120 });
  const f = factory(s, { x: 0, y: -200 });
  const t2 = SLOTS.findIndex((d) => d.tier === 2);
  const d = drillOn(s, t2);
  const sm = smelter(s, { x: SLOTS[t2].x, y: SLOTS[t2].y + 130 });
  assert.equal(route(s, a.id, { kind: 'factory', id: f.id }), true);
  assert.equal(route(s, b.id, { kind: 'factory', id: f.id }), true);
  assert.equal(route(s, f.id, { kind: 'drill', id: d.id }), true);
  assert.equal(route(s, d.id, { kind: 'smelter', id: sm.id }), true);
  arrive(a, COPPER);
  arrive(b, CRYSTAL);
  const got = runFor(s, 60);
  const alloys = got.filter((e) => e.alloy !== undefined);
  assert.equal(alloys.length, 1);
  assert.equal(
    alloys[0].value,
    alloyOf([
      { ore: COPPER, mult: BAR_VALUE },
      { ore: CRYSTAL, mult: BAR_VALUE },
    ]).v
  );
});

test('the matrix: plain drills are told to smelt first; a factory feeds only docks and drills', () => {
  const s = rich();
  const a = smelter(s, { x: -120, y: -120 });
  const f = factory(s, { x: 0, y: -200 });
  const g = factory(s, { x: 150, y: -200 });
  const d = drillOn(s, 0);
  assert.equal(targetWhy(s, d, { kind: 'factory', id: f.id }), 'smelt it first');
  assert.equal(route(s, d.id, { kind: 'factory', id: f.id }), 'invalid');
  assert.equal(route(s, f.id, { kind: 'smelter', id: a.id }), 'invalid');
  assert.equal(route(s, f.id, { kind: 'factory', id: g.id }), 'invalid');
  // A drill with an input is a junction, and may feed a factory.
  assert.equal(route(s, a.id, { kind: 'drill', id: d.id }), true);
  assert.equal(route(s, d.id, { kind: 'factory', id: f.id }), true);
});

test('the switch and the unlock: off refuses to build, on needs two smelters', () => {
  const s = freshState(5);
  s.credits = 1e12;
  s.crossings = false;
  assert.equal(buildFactory(s, { x: 0, y: -200 }), 'unavailable');
  setFactories(s, true);
  assert.equal(factoryUnlocked(s), false);
  smelter(s, { x: -120, y: -120 });
  smelter(s, { x: 120, y: -120 });
  assert.equal(factoryUnlocked(s), true);
  setFactories(s, false);
  assert.equal(factoryUnlocked(s), false);
});

test('a factory spliced onto a wide belt starts at tier 1', () => {
  const s = rich();
  const a = smelter(s, { x: 0, y: -160 });
  assert.equal(widen(s, a.id), true);
  assert.equal(widen(s, a.id), true);
  assert.equal(a.tier, 3);
  const at = a.out!.to.kind === 'dock' ? a : null;
  assert.ok(at);
  // Splice the factory into the smelter's belt, halfway to its dock.
  const p = { x: a.x * 0.5, y: a.y * 0.5 };
  const r = buildFactory(s, p, a.id);
  assert.equal(r, true, `splice: ${r}`);
  const f = last(s) as Factory;
  assert.deepEqual(a.out!.to, { kind: 'factory', id: f.id });
  assert.equal(f.tier, 1);
  assert.equal(f.tierBought, 0);
});

test('no sequence of place, splice, route, move, widen and sell grants an unbought tier', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (const crossings of [false, true]) {
    const s = rich(crossings);
    for (let k = 0; k < 400; k++) {
      const ms = s.machines;
      const pick = () => ms[Math.floor(rnd() * ms.length)];
      const p = { x: (rnd() - 0.5) * 600, y: -rnd() * 900 };
      const m = ms.length ? pick() : undefined;
      switch (Math.floor(rnd() * 8)) {
        case 0:
          buildSmelter(s, p, rnd() < 0.5 ? m?.id : null);
          break;
        case 1:
          buildFactory(s, p, rnd() < 0.5 ? m?.id : null);
          break;
        case 2:
          try {
            drillOn(s, Math.floor(rnd() * 3));
          } catch {
            // That rock's rim is full.
          }
          break;
        case 3:
          if (m && ms.length > 1) {
            const t = pick();
            route(s, m.id, { kind: t.kind, id: t.id } as never);
          }
          break;
        case 4:
          if (m) widen(s, m.id);
          break;
        case 5:
          if (m && m.kind !== 'drill') moveSmelter(s, m.id, p, rnd() < 0.5 ? pick().id : null);
          break;
        case 6:
          if (m && ms.length > 6) sell(s, m.id);
          break;
        default:
          for (let t = 0; t < 10; t++) step(s);
      }
      for (const x of s.machines)
        assert.equal(x.tier, 1 + x.tierBought, `machine ${x.id} (${x.kind}) after step ${k}`);
    }
    assert.ok(s.machines.some((x) => x.kind === 'factory'));
  }
});

test('factories, their stock and alloys on belts survive a save round trip', () => {
  const { s, a, b, f } = line();
  arrive(a, COPPER);
  arrive(b, CRYSTAL);
  f.stock.push({ ore: GOLD, mult: BAR_VALUE, t: s.tick });
  runFor(s, 0.5);
  arrive(f, COPPER, BAR_VALUE, { alloy: CRYSTAL, v: 495 });
  const text = serialize(s);
  const back = deserialize(text)!;
  assert.ok(back);
  assert.equal(back.version, 3);
  assert.equal(back.factories, true);
  assert.equal(serialize(back), text);
  const g = byId(back, f.id) as Factory;
  assert.equal(g.kind, 'factory');
  assert.deepEqual(g.out!.items[0].alloy, CRYSTAL);
  // A corrupt alloy (the higher ore must be in `alloy`) is refused.
  const bad = JSON.parse(text);
  const bm = bad.machines.find((m: { id: number }) => m.id === f.id);
  bm.out.items[0].alloy = 1;
  assert.equal(deserialize(JSON.stringify(bad)), null);
  // An older format never holds factories.
  const old = JSON.parse(text);
  old.version = 2;
  assert.equal(deserialize(JSON.stringify(old)), null);
});
