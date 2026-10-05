import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Ore,
  BAR_VALUE,
  LAB_HOLD,
  LIFT_BILLS,
  LIFT_PRICES,
  RECIPES,
  TICK_HZ,
} from '../src/rockhopper/config';
import {
  beltPath,
  buildDrill,
  buildFactory,
  buildSmelter,
  buyLift,
  drills,
  factoryUnlocked,
  freshState,
  labOffered,
  labRows,
  labSnap,
  labSpotWhy,
  liftPrice,
  pathLength,
  placeLab,
  pointAlong,
  route,
  setFactories,
  setLabActive,
  setResearch,
  smelterSpotOk,
  step,
  type Machine,
  type Point,
  type SimEvent,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

const COPPER = 2 as Ore,
  ICE = 3 as Ore,
  GOLD = 4 as Ore,
  CRYSTAL = 5 as Ore;

function spot(s: State, from: Point): Point {
  for (let r = 0; r < 400; r += 10)
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const p = { x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r };
      if (smelterSpotOk(s, p)) return p;
    }
  throw new Error('no spot');
}

/** Research on, one drill whose rock is gone (only fed items move), one smelter, the Lab on the drill's belt. */
function lab() {
  const s = freshState(1);
  s.credits = 1e12;
  s.docks = 9;
  s.crossings = false;
  setFactories(s, true);
  assert.equal(setResearch(s, true), true);
  assert.equal(buildDrill(s, 0, Math.PI * 0.5), true);
  const d = drills(s)[0];
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  assert.equal(labOffered(s), false, 'not before a smelter');
  assert.equal(buildSmelter(s, spot(s, { x: 160, y: -60 })), true);
  assert.equal(labOffered(s), true);
  const path = beltPath(s, d)!;
  const L = pathLength(path);
  const mid = pointAlong(path, L / 2);
  assert.equal(placeLab(s, { x: mid.x + 10, y: mid.y }), true);
  assert.equal(labOffered(s), false);
  assert.equal(s.research!.lab!.owner, d.id);
  s.research!.known = [COPPER, ICE, GOLD, CRYSTAL];
  return { s, d };
}

/** Put an item at the start of `m`'s belt. */
function feed(m: Machine, ores: Ore[], mult = 1, extra: { alloy?: Ore; v?: number } = {}) {
  m.out!.items.push({ pos: 0, ores: [...ores], mult, ...extra });
}

function runFor(s: State, seconds: number) {
  const seen: SimEvent[] = [];
  for (let t = 0; t < seconds * TICK_HZ; t++) {
    s.events = [];
    step(s);
    seen.push(...s.events);
  }
  return seen;
}

test('the Lab counts a pair only when both ores reach it, one entry per ore', () => {
  const { s, d } = lab();
  assert.equal(setLabActive(s, 'cu-ice'), true);
  feed(d, [COPPER, COPPER]);
  runFor(s, 4);
  assert.equal(s.research!.counts?.['cu-ice'] ?? 0, 0, 'copper alone counts nothing');
  assert.deepEqual(
    s.research!.hold!.map((h) => h.ore),
    [COPPER],
    'one copper held, the other passes'
  );
  feed(d, [ICE]);
  const ev = runFor(s, 4);
  assert.equal(s.research!.counts!['cu-ice'], 1);
  assert.equal(s.research!.hold!.length, 0);
  assert.ok(ev.some((e) => e.type === 'skim' && e.ore === ICE));
  const delivered = ev.filter((e) => e.type === 'deliver');
  assert.equal(delivered.length, 0, 'the emptied ice bundle is removed');
});

test('a held entry is dropped after LAB_HOLD seconds without a partner', () => {
  const { s, d } = lab();
  setLabActive(s, 'cu-ice');
  feed(d, [COPPER]);
  runFor(s, 3);
  assert.equal(s.research!.hold!.length, 1);
  runFor(s, LAB_HOLD);
  assert.equal(s.research!.hold!.length, 0);
});

test('alloys are never taken, and the belt never waits for the Lab', () => {
  const { s, d } = lab();
  setLabActive(s, 'cu-ice');
  feed(d, [COPPER], BAR_VALUE, { alloy: CRYSTAL, v: 495 });
  const ev = runFor(s, 5);
  assert.equal(ev.filter((e) => e.type === 'deliver').length, 1);
  assert.equal(s.research!.hold!.length, 0);
});

test('learning the first recipe unlocks factories; recipes are learned one at a time', () => {
  const { s, d } = lab();
  assert.equal(factoryUnlocked(s), false);
  assert.equal(buildFactory(s, spot(s, { x: -160, y: -60 })), 'locked');
  setLabActive(s, 'cu-ice');
  const need = RECIPES.find((r) => r.id === 'cu-ice')!.count;
  let learned: SimEvent | undefined;
  for (let i = 0; i < need && !learned; i++) {
    feed(d, [COPPER, ICE]);
    learned = runFor(s, 0.5).find((e) => e.type === 'learn');
  }
  runFor(s, 3);
  assert.deepEqual(s.research!.learned, ['cu-ice']);
  assert.equal(s.research!.active, undefined, 'the Lab idles until the next pick');
  assert.equal(factoryUnlocked(s), true);
  assert.equal(buildFactory(s, spot(s, { x: -160, y: -60 })), true);
  assert.equal(setLabActive(s, 'cu-ice'), 'done');
});

test('lift bills take every owed paired bar of one ore, then the lift can be bought', () => {
  const { s, d } = lab();
  s.research!.learned = ['cu-ice', 'ice-au', 'cu-au'];
  const rows = labRows(s);
  assert.ok(rows.some((r) => r.id === 'lift0'));
  assert.ok(!rows.some((r) => r.id === 'lift1'), 'the second bill waits for the first');
  assert.equal(setLabActive(s, 'lift0'), true);
  const bill = LIFT_BILLS[0];
  s.research!.counts = { lift0: bill.count - 3 };
  // Raw chunks and lone bars of the ore don't count; paired bars do, as many as are owed.
  feed(d, [bill.ore], 1);
  feed(d, [bill.ore], 3);
  runFor(s, 1);
  feed(d, [bill.ore, bill.ore, bill.ore, bill.ore], BAR_VALUE);
  const ev = runFor(s, 5);
  assert.equal(s.research!.counts!.lift0, bill.count);
  const left = ev.filter((e) => e.type === 'deliver');
  assert.equal(left.length, 3, 'two unpaired items and the one bar not owed reach the dock');
  assert.equal(s.research!.active, undefined);
  assert.ok(
    labRows(s).some((r) => r.id === 'lift1'),
    'the next bill appears at once'
  );
  assert.equal(liftPrice(s), LIFT_PRICES[0]);
  const c = s.credits;
  assert.equal(buyLift(s), true);
  assert.equal(s.credits, c - LIFT_PRICES[0]);
  assert.equal(s.research!.lifts.owned, 1);
  assert.equal(buyLift(s), 'unavailable', 'the second lift waits for its bill');
});

test('a factory pairs only learned recipes, plus copper with crystal', () => {
  const s = freshState(5);
  s.slots.forEach((x) => (x.unlocked = true));
  s.credits = 1e12;
  s.crossings = false;
  s.docks = 9;
  setFactories(s, true);
  setResearch(s, true);
  s.research!.learned = ['cu-ice'];
  const smelterAt = (p: Point) => {
    assert.equal(buildSmelter(s, spot(s, p)), true);
    return s.machines[s.machines.length - 1];
  };
  const a = smelterAt({ x: -120, y: -120 });
  const b = smelterAt({ x: 120, y: -120 });
  assert.equal(buildFactory(s, spot(s, { x: 0, y: -200 })), true);
  const f = s.machines[s.machines.length - 1];
  route(s, a.id, { kind: 'factory', id: f.id });
  route(s, b.id, { kind: 'factory', id: f.id });
  const arrive = (m: Machine, ore: Ore) =>
    m.out!.items.unshift({ pos: m.out!.length, ores: [ore], mult: BAR_VALUE });
  const alloys = (ev: SimEvent[]) =>
    ev.filter((e) => e.type === 'deliver' && e.alloy !== undefined).length;
  arrive(a, ICE);
  arrive(b, GOLD);
  assert.equal(alloys(runFor(s, 20)), 0, 'ice + gold is not learned: both pass as bars');
  arrive(a, COPPER);
  arrive(b, ICE);
  assert.equal(alloys(runFor(s, 20)), 1);
  arrive(a, COPPER);
  arrive(b, CRYSTAL);
  assert.equal(alloys(runFor(s, 20)), 1, 'copper + crystal is never gated');
});

test('the Lab clamps only at legal spots and goes idle when its belt is gone', () => {
  const { s, d } = lab();
  const L = pathLength(beltPath(s, d)!);
  assert.notEqual(labSpotWhy(s, d.id, 5), '');
  assert.notEqual(labSpotWhy(s, d.id, L - 5), '');
  assert.equal(labSnap(s, { x: 5000, y: 5000 }), null);
  setLabActive(s, 'cu-ice');
  feed(d, [COPPER]);
  runFor(s, 3);
  s.machines = s.machines.filter((m) => m.id !== d.id);
  runFor(s, 0.2);
  assert.equal(s.research!.lab!.owner, -1);
  assert.equal(s.research!.hold!.length, 0);
});

test('switching research on with a factory built grants what is available', () => {
  const s = freshState(5);
  s.slots.forEach((x, i) => (x.unlocked = i < 3));
  s.credits = 1e12;
  setFactories(s, true);
  buildSmelter(s, spot(s, { x: -120, y: -120 }));
  buildSmelter(s, spot(s, { x: 120, y: -120 }));
  assert.equal(buildFactory(s, spot(s, { x: 0, y: -200 })), true);
  assert.equal(setResearch(s, true), true);
  assert.equal(factoryUnlocked(s), true);
  assert.ok(s.research!.learned!.includes('cu-ice'), 'T1 carries copper and ice');
  assert.ok(!s.research!.learned!.includes('au-cr'));
});

test('the Lab and its counts survive a save round-trip; a bad Lab field resets research', () => {
  const { s, d } = lab();
  setLabActive(s, 'cu-ice');
  feed(d, [COPPER, ICE]);
  runFor(s, 4);
  const back = deserialize(serialize(s))!;
  assert.deepEqual(back.research, s.research);
  const raw = JSON.parse(serialize(s));
  raw.research.lab = { owner: 'x' };
  assert.deepEqual(deserialize(JSON.stringify(raw))!.research, {
    on: false,
    lifts: { owned: 0, raised: [] },
  });
});
