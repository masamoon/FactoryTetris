import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_DRILL,
  FIXED_FACTORY,
  FIXED_SMELTER,
  FIXED_WIDEN,
  SLOTS,
  classicDrillPrice,
  dockCost,
  smelterPrice,
} from '../src/rockhopper/config';
import {
  applyCommand,
  buildDrill,
  buildSmelter,
  drillPriceOn,
  freshState,
  hubCost,
  moveDrill,
  moveDrillCost,
  priceOf,
  sell,
  sellValue,
  upgradeHub,
  widen,
  widenPrice,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

const T2 = SLOTS.findIndex((d) => d.tier === 2);

function rich(): State {
  const s = freshState(3);
  s.slots.forEach((x) => (x.unlocked = true));
  s.credits = 1e12;
  return s;
}

function drillOn(s: State, i: number): number {
  for (let a = 0; a < Math.PI * 2; a += 0.02)
    if (buildDrill(s, i, a) === true) return s.machines[s.machines.length - 1].id;
  throw new Error(`no room on slot ${i}`);
}

/** Build a smelter on the first open spot of a coarse grid around the hub. */
function smelterSomewhere(s: State): void {
  for (let y = 60; y < 400; y += 30)
    for (let x = -400; x <= 400; x += 30) if (buildSmelter(s, { x, y }) === true) return;
  throw new Error('no room for a smelter');
}

test('new games and old saves start with fixed costs', () => {
  assert.equal(freshState(1).fixedCosts, true);
  const old = JSON.parse(serialize(freshState(1))) as Record<string, unknown>;
  delete old.fixedCosts;
  assert.equal(deserialize(JSON.stringify(old))!.fixedCosts, true);
  const off = freshState(1);
  off.fixedCosts = false;
  assert.equal(deserialize(serialize(off))!.fixedCosts, false);
});

test('every drill on a tier costs the same, however many are owned', () => {
  const s = rich();
  for (let k = 0; k < 6; k++) {
    const before = s.credits;
    drillOn(s, 0);
    assert.equal(before - s.credits, FIXED_DRILL[1]);
  }
  assert.equal(drillPriceOn(s, T2), FIXED_DRILL[2]);
  assert.equal(priceOf(s, 'drill'), FIXED_DRILL[1]);
});

test('smelters and factories keep one price; docks keep their hub-level schedule', () => {
  const s = rich();
  for (let k = 0; k < 4; k++) {
    const before = s.credits;
    smelterSomewhere(s);
    assert.equal(before - s.credits, FIXED_SMELTER);
  }
  assert.equal(priceOf(s, 'factory'), FIXED_FACTORY);
  for (let k = 0; k < 3; k++) {
    assert.equal(hubCost(s, 'docks'), dockCost(s.docks));
    upgradeHub(s, 'docks');
  }
});

test('widening is priced by the step bought, not by steps bought elsewhere', () => {
  const s = rich();
  const ia = drillOn(s, 0);
  const ib = drillOn(s, 0);
  const a = s.machines.find((m) => m.id === ia)!;
  const b = s.machines.find((m) => m.id === ib)!;
  for (let step = 0; step < 3; step++) {
    assert.equal(widenPrice(s, a), FIXED_WIDEN[step]);
    widen(s, a.id);
  }
  assert.equal(widenPrice(s, a), null, 'tier 4 is the top');
  assert.equal(widenPrice(s, b), FIXED_WIDEN[0], 'other belts are unaffected');
});

test('a move up a tier pays the difference; within a tier or down is free', () => {
  const s = rich();
  const T4 = SLOTS.findIndex((d) => d.tier === 4);
  const id = drillOn(s, 0);
  assert.equal(moveDrillCost(s, id, 1), 0);
  assert.equal(moveDrillCost(s, id, T4), FIXED_DRILL[4] - FIXED_DRILL[1]);
  s.credits = FIXED_DRILL[4] - FIXED_DRILL[1] - 1;
  let r: unknown = null;
  for (let a = 0; a < Math.PI * 2 && r !== 'credits' && r !== true; a += 0.02)
    r = moveDrill(s, id, T4, a);
  assert.equal(r, 'credits');
  s.credits = 1e12;
  const before = s.credits;
  for (let a = 0; a < Math.PI * 2 && r !== true; a += 0.02) r = moveDrill(s, id, T4, a);
  assert.equal(r, true);
  assert.equal(before - s.credits, FIXED_DRILL[4] - FIXED_DRILL[1]);
  assert.equal(moveDrillCost(s, id, 0), 0, 'back down is free');
});

test('selling refunds half, so selling and rebuying always loses', () => {
  const s = rich();
  const id = drillOn(s, 0);
  const m = s.machines.find((x) => x.id === id)!;
  const refund = sellValue(m);
  sell(s, id);
  assert.equal(refund, Math.floor(FIXED_DRILL[1] / 2));
  assert.equal(priceOf(s, 'drill'), FIXED_DRILL[1]);
});

test('the switch brings back rising prices', () => {
  const s = rich();
  drillOn(s, 0);
  smelterSomewhere(s);
  applyCommand(s, 'setFixedCosts', [false]);
  applyCommand(s, 'setRockPrices', [false]);
  assert.equal(priceOf(s, 'drill'), classicDrillPrice(1));
  assert.equal(priceOf(s, 'smelter'), smelterPrice(1));
});
