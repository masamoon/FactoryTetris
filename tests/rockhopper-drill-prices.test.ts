import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRILL_BASE, SLOTS, classicDrillPrice, drillPrice } from '../src/rockhopper/config';
import {
  applyCommand,
  buildDrill,
  drillPriceOn,
  drills,
  freshState,
  moveDrill,
  moveDrillCost,
  priceOf,
  sell,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/** Slot indices: two T1 rocks and a T2 rock. */
const A = 0;
const B = 1;
const T2 = SLOTS.findIndex((d) => d.tier === 2);

/** A factory with every slot open and deep pockets. */
function rich(): State {
  const s = freshState(3);
  s.fixedCosts = false;
  s.slots.forEach((x) => (x.unlocked = true));
  s.credits = 1e12;
  return s;
}

/** Build a drill on slot `i` at the first legal rim spot; returns its id. */
function drillOn(s: State, i: number): number {
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    if (buildDrill(s, i, a) === true) return s.machines[s.machines.length - 1].id;
  }
  throw new Error(`no room on slot ${i}`);
}

/** Move drill `id` to the first legal rim spot on slot `i`; returns the last result. */
function moveTo(s: State, id: number, i: number): unknown {
  let r: unknown = 'no room';
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    r = moveDrill(s, id, i, a);
    if (r === true || r === 'credits') return r;
  }
  return r;
}

test('a drill is priced by its rock: the tier base, grown per drill on that rock', () => {
  const s = rich();
  for (let k = 0; k < 4; k++) drillOn(s, A);
  assert.equal(drillPriceOn(s, A), drillPrice(1, 4));
  // A fresh rock starts at its tier's base, whatever stands elsewhere.
  assert.equal(drillPriceOn(s, B), drillPrice(1, 0));
  assert.equal(drillPriceOn(s, T2), drillPrice(2, 0));
  const before = s.credits;
  drillOn(s, T2);
  assert.equal(before - s.credits, drillPrice(2, 0));
  // The tray shows the cheapest unlocked rock.
  assert.equal(priceOf(s, 'drill'), drillPrice(1, 0));
});

test('the tray ignores rocks that are still locked', () => {
  const s = freshState(3);
  s.fixedCosts = false;
  assert.equal(priceOf(s, 'drill'), drillPrice(1, 0));
  s.slots.forEach((x, i) => (x.unlocked = SLOTS[i].tier === 2));
  assert.equal(priceOf(s, 'drill'), drillPrice(2, 0));
});

test('a full rock stays under 20× its base, and below the next tier where it can', () => {
  const s = rich();
  for (let i = 0; i < SLOTS.length; i++) {
    let n = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.01) if (buildDrill(s, i, a) === true) n++;
    const tier = SLOTS[i].tier;
    const last = drillPrice(tier, n - 1);
    assert.ok(last <= DRILL_BASE[tier] * 20, `slot ${i}: last of ${n} costs ${last}`);
    if (tier <= 2) assert.ok(last < DRILL_BASE[(tier + 1) as 2 | 3], `slot ${i}`);
  }
});

test('moving costs what the destination is pricier by, in any direction', () => {
  const s = rich();
  const a = drillOn(s, A);
  drillOn(s, A);
  assert.equal(moveDrillCost(s, a, T2), drillPrice(2, 0) - drillPrice(1, 1));
  assert.equal(moveDrillCost(s, a, A), 0);
  // Onto an emptier rock of the same tier: free.
  assert.equal(moveDrillCost(s, a, B), 0);
  const spent = drills(s).find((d) => d.id === a)!.spent;
  const before = s.credits;
  const cost = moveDrillCost(s, a, T2);
  assert.equal(moveTo(s, a, T2), true);
  assert.equal(before - s.credits, cost);
  assert.equal(drills(s).find((d) => d.id === a)!.spent, spent + cost, 'sell refunds half of it');
  // Back down to a cheaper rock is free.
  assert.equal(moveDrillCost(s, a, B), 0);
});

test('a move onto a crowded rock is charged, so buying elsewhere and dragging is no discount', () => {
  const s = rich();
  for (let k = 0; k < 8; k++) drillOn(s, A);
  const b = drillOn(s, B); // B's base price
  assert.equal(moveDrillCost(s, b, A), drillPrice(1, 8) - drillPrice(1, 0));
  // A T2 drill bought at its base and dragged down onto the crowded T1 rock pays nothing
  // extra only when the T2 base already exceeds that rock's price.
  const t = drillOn(s, T2);
  assert.equal(moveDrillCost(s, t, A), Math.max(0, drillPrice(1, 8) - drillPrice(2, 0)));
});

test('an expensive move is refused without the credits', () => {
  const s = rich();
  const a = drillOn(s, A);
  s.credits = 0;
  assert.equal(moveTo(s, a, T2), 'credits');
  assert.equal(drills(s)[0].slot, A);
});

test('no sequence of buys and moves beats buying every drill where it ends up', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const slots = [0, 1, 2, 3, 4];
  for (let round = 0; round < 20; round++) {
    const s = rich();
    const start = s.credits;
    for (let k = 0; k < 40; k++) {
      const ds = drills(s);
      if (ds.length && rnd() < 0.5)
        moveTo(s, ds[Math.floor(rnd() * ds.length)].id, slots[Math.floor(rnd() * 5)]);
      else {
        const i = slots[Math.floor(rnd() * 5)];
        for (let a = rnd() * 6; a < rnd() * 6 + 6.3; a += 0.05)
          if (buildDrill(s, i, a) === true) break;
      }
    }
    let honest = 0;
    for (const i of slots) {
      const n = drills(s).filter((d) => d.slot === i).length;
      for (let k = 0; k < n; k++) honest += drillPrice(SLOTS[i].tier, k);
    }
    assert.ok(start - s.credits >= honest, `round ${round}: paid ${start - s.credits} < ${honest}`);
  }
});

test('selling a drill lowers its rock price again', () => {
  const s = rich();
  const a = drillOn(s, A);
  drillOn(s, A);
  assert.equal(drillPriceOn(s, A), drillPrice(1, 2));
  sell(s, a);
  assert.equal(drillPriceOn(s, A), drillPrice(1, 1));
});

test('the switch brings back classic prices and free moves', () => {
  const s = rich();
  const a = drillOn(s, A);
  drillOn(s, A);
  applyCommand(s, 'setRockPrices', [false]);
  assert.equal(drillPriceOn(s, T2), classicDrillPrice(2));
  assert.equal(priceOf(s, 'drill'), classicDrillPrice(2));
  assert.equal(moveDrillCost(s, a, T2), 0);
});

test('the switch survives a save; saves from before it load with prices by rock', () => {
  const s = rich();
  s.rockPrices = false;
  assert.equal(deserialize(serialize(s))!.rockPrices, false);
  const old = JSON.parse(serialize(s)) as Record<string, unknown>;
  delete old.rockPrices;
  assert.equal(deserialize(JSON.stringify(old))!.rockPrices, true);
});
