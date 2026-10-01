import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_TOW_SECONDS,
  CRUMBLE_FLIGHT_MAX,
  DEPTH,
  ORES,
  SLOTS,
  SLOW_PRICE,
  TICK_HZ,
} from '../src/rockhopper/config';
import {
  cellPos,
  freshState,
  generateRock,
  hubCost,
  rockDepth,
  run,
  setLaser,
  shadeBand,
  step,
  unlockCost,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/** Give berth 0 a deep rock (its second), as slow-burn would tow in after the starter rock. */
function deepGame(seed = 3): State {
  const s = freshState(seed, false, true);
  s.slots[0].rock = generateRock(0, 1, seed, rockDepth(s, 0, 1));
  s.slots[0].gen = 2;
  return s;
}

test('a classic game has no slow-burn fields and keeps the tractor', () => {
  const s = freshState(1);
  assert.equal(s.slowRocks, undefined);
  assert.equal(s.slots[0].rock!.layers, undefined);
  assert.notEqual(hubCost(s, 'tractor'), null);
  assert.equal(unlockCost(s, 1), SLOTS[1].price);
});

test('slow-burn: the starter rock is depth 1, later rocks are deep by tier', () => {
  const s = freshState(1, false, true);
  assert.equal(s.slowRocks, true);
  assert.equal(s.slots[0].rock!.layers, undefined);
  assert.equal(rockDepth(s, 0, 0), 1);
  assert.equal(rockDepth(s, 0, 1), DEPTH[1]);
  assert.equal(rockDepth(s, 3, 0), DEPTH[2]);
  const rock = generateRock(0, 1, 1, DEPTH[1]);
  assert.equal(rock.layersTotal, rock.total * DEPTH[1]);
  rock.cells.forEach((c, k) => assert.equal(rock.layers![k], c ? DEPTH[1] : 0));
});

test('slow-burn: no tractor, and slot prices by tier', () => {
  const s = freshState(1, false, true);
  assert.equal(hubCost(s, 'tractor'), null);
  assert.equal(unlockCost(s, 1), Math.round(SLOTS[1].price * SLOW_PRICE[1]));
});

test('a deep cell gives one chunk per layer, is scratched at once, and goes with its last layer', () => {
  const s = deepGame();
  const rock = s.slots[0].rock!;
  const k = rock.cells.findIndex((c) => c > 0);
  setLaser(s, 0, cellPos(0, rock, k));
  const cell = () => s.laser!.cell;
  step(s);
  const target = cell();
  assert.ok(target >= 0);
  const ore = rock.cells[target];
  let breaks = 0;
  let value = 0;
  let scratchedAt = -1;
  for (let t = 0; t < 120 * TICK_HZ && rock.cells[target]; t++) {
    step(s);
    for (const e of s.events) if (e.type === 'break' && e.cell === target) breaks++;
    for (const f of s.flights) if (f.t0 === s.tick) value += f.value;
    if (scratchedAt < 0 && shadeBand(rock.layers![target], DEPTH[1]) === 1) scratchedAt = s.tick;
    s.events.length = 0;
  }
  assert.equal(rock.cells[target], 0, 'the cell is gone after its last layer');
  assert.equal(breaks, DEPTH[1]);
  assert.equal(value, DEPTH[1] * ORES[ore as 1].value);
  assert.ok(scratchedAt >= 0 && scratchedAt < 2 * TICK_HZ, 'scratched within 2 s');
});

test('a deep rock crumbles at 5 % of its layers, in flights of at most 4 chunks', () => {
  const s = deepGame();
  const rock = s.slots[0].rock!;
  // Strip every cell down to one layer but a few, so the next break crosses 5 %.
  const live = rock.cells.map((c, k) => (c ? k : -1)).filter((k) => k >= 0);
  for (const k of live) rock.layers![k] = 1;
  rock.layersLeft = live.length;
  for (let i = live.length - 1; rock.layersLeft < rock.layersTotal! * 0.05 + 1; i--) {
    rock.layers![live[i]] = DEPTH[1];
    rock.layersLeft += DEPTH[1] - 1;
  }
  assert.ok(rock.layersLeft >= rock.layersTotal! * 0.05);
  const before = rock.layersLeft;
  s.laser = { slot: 0, x: cellPos(0, rock, live[1]).x, y: cellPos(0, rock, live[1]).y, cell: -1 };
  let crumbled = 0,
    flights = 0,
    maxFlight = 0,
    delivered = 0;
  for (let t = 0; t < 30 * TICK_HZ && s.slots[0].rock; t++) {
    step(s);
    for (const e of s.events) {
      if (e.type === 'crumble') crumbled++;
      if (e.type === 'break') delivered += e.chunks ?? 1;
    }
    for (const f of s.flights)
      if (f.t0 === s.tick) {
        flights++;
        maxFlight = Math.max(maxFlight, f.value / ORES[f.ore].value);
      }
    s.events.length = 0;
  }
  assert.equal(crumbled, 1);
  assert.equal(s.slots[0].rock, null);
  assert.ok(maxFlight <= CRUMBLE_FLIGHT_MAX);
  assert.equal(delivered, before, 'every layer was delivered once');
  assert.ok(flights > 0);
});

test('slow-burn: a spent berth tows its next deep rock in after 3 s', () => {
  const s = freshState(5, false, true);
  const rock = s.slots[0].rock!;
  // The starter rock: break everything at once.
  for (let k = 0; k < rock.cells.length; k++) rock.cells[k] = 0;
  rock.remaining = 0;
  step(s);
  assert.equal(s.slots[0].rock, null);
  const at = s.slots[0].arriveAt;
  assert.equal(at - s.tick, Math.round(AUTO_TOW_SECONDS * TICK_HZ));
  run(s, at - s.tick);
  const next = s.slots[0].rock!;
  assert.ok(next);
  assert.equal(next.depth, DEPTH[1]);
});

test('a slow-burn save round-trips its layers; bad layers are refused', () => {
  const s = deepGame(8);
  const rock = s.slots[0].rock!;
  const k = rock.cells.findIndex((c) => c > 0);
  setLaser(s, 0, cellPos(0, rock, k));
  run(s, 3 * TICK_HZ);
  const text = serialize(s);
  const back = deserialize(text)!;
  assert.equal(back.slowRocks, true);
  const r2 = back.slots[0].rock!;
  assert.deepEqual(r2.layers, rock.layers);
  assert.equal(r2.layersLeft, rock.layersLeft);
  assert.equal(r2.layersTotal, rock.layersTotal);
  assert.equal(r2.depth, DEPTH[1]);
  const raw = JSON.parse(text);
  raw.slots[0].rock.layers = raw.slots[0].rock.layers.replace(/^\d+/, '999');
  assert.equal(deserialize(JSON.stringify(raw)), null);
  // A classic save carries no slow-burn fields.
  const classic = JSON.parse(serialize(freshState(8)));
  assert.equal(classic.slowRocks, undefined);
  assert.equal(classic.slots[0].rock.layers, undefined);
});
