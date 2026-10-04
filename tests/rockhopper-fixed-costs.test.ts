import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_DRILL,
  FIXED_FACTORY,
  FIXED_SMELTER,
  FIXED_DOCK,
  FIXED_LASER,
  FIXED_LEVEL,
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
  upgrade,
  upgradeCost,
  upgradeHub,
  widen,
  widenPrice,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';
import { runBot } from '../tools/rockhopper-bot';

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

test('smelters, factories, docks and laser levels keep one price', () => {
  const s = rich();
  for (let k = 0; k < 4; k++) {
    const before = s.credits;
    smelterSomewhere(s);
    assert.equal(before - s.credits, FIXED_SMELTER);
  }
  assert.equal(priceOf(s, 'factory'), FIXED_FACTORY);
  for (let k = 0; k < 3; k++) {
    assert.equal(hubCost(s, 'docks'), FIXED_DOCK);
    upgradeHub(s, 'docks');
    assert.equal(hubCost(s, 'laser'), FIXED_LASER);
    upgradeHub(s, 'laser');
  }
});

test('every widening step and every level costs the same', () => {
  const s = rich();
  const ia = drillOn(s, 0);
  const ib = drillOn(s, 0);
  const a = s.machines.find((m) => m.id === ia)!;
  const b = s.machines.find((m) => m.id === ib)!;
  for (let step = 0; step < 3; step++) {
    assert.equal(widenPrice(s, a), FIXED_WIDEN);
    widen(s, a.id);
  }
  assert.equal(widenPrice(s, a), null, 'tier 4 is the top');
  assert.equal(widenPrice(s, b), FIXED_WIDEN);
  for (let l = 1; l < 7; l++) {
    assert.equal(upgradeCost(s, a), FIXED_LEVEL.drill);
    upgrade(s, a.id);
  }
  assert.equal(upgradeCost(s, a), null, 'max level');
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
  assert.equal(hubCost(s, 'docks'), dockCost(s.docks));
});

test('the default game keeps its opening under fixed costs (pacing bot, an upper bound)', () => {
  const { beats } = runBot({ minutes: 10, laser: true, seed: 1, slowRocks: true });
  const at = (l: string) => beats.find((b) => b.label === l)?.seconds ?? Infinity;
  assert.ok(at('drill #1') <= 10, `first drill ${at('drill #1')}`);
  assert.ok(at('smelter #1') >= 30 && at('smelter #1') <= 120, `first smelter ${at('smelter #1')}`);
  assert.ok(at('T2 reached') <= 8 * 60, `T2 ${at('T2 reached')}`);
});
