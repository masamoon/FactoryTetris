import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL,
  COPPER,
  CRYSTAL,
  ICE,
  PICK_REACH,
  ROCK,
  SLOTS,
  type Ore,
} from '../src/rockhopper/config';
import {
  buildDrill,
  drills,
  firstCells,
  freshState,
  rimPos,
  setOrePicks,
  setPick,
  setPickReach,
  step,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

function withDrill(seed = 1): State {
  const s = freshState(seed);
  s.credits = 1e12;
  setOrePicks(s, true);
  assert.equal(buildDrill(s, 0, 0), true);
  return s;
}

/** Ores the drills broke over `ticks` ticks, in order. */
function dig(s: State, ticks: number): Ore[] {
  const out: Ore[] = [];
  for (let t = 0; t < ticks; t++) {
    step(s);
    for (const e of s.events) if (e.type === 'break' && e.by === 'drill') out.push(e.ore);
    s.events.length = 0;
  }
  return out;
}

test('a picked drill digs only its ore while the rock has any, then anything', () => {
  const s = withDrill();
  const d = drills(s)[0];
  const rock = s.slots[0].rock!;
  const copper = rock.cells.filter((c) => c === COPPER).length;
  assert.ok(copper > 3);
  assert.equal(setPick(s, d.id, COPPER), true);
  const ores: Ore[] = [];
  // Until the copper runs out (or the rock is replaced), every drill break is copper.
  for (let t = 0; t < 30 * 600 && s.slots[0].rock === rock; t++) {
    ores.push(...dig(s, 1));
    if (!rock.cells.includes(COPPER)) break;
  }
  assert.ok(ores.length >= copper, `dug ${ores.length} of ${copper}`);
  assert.deepEqual(ores.slice(0, copper), new Array(copper).fill(COPPER));
  // With the copper gone it keeps digging what is left.
  const after = dig(s, 30 * 20);
  assert.ok(after.length > 0);
  assert.ok(after.every((o) => o !== COPPER));
});

test('no pick digs exactly as before', () => {
  const a = withDrill(2);
  const b = withDrill(2);
  setPick(b, drills(b)[0].id, ICE);
  setPick(b, drills(b)[0].id, null);
  assert.equal(drills(b)[0].pick, undefined);
  assert.deepEqual(dig(a, 30 * 60), dig(b, 30 * 60));
});

test('with a reach cap, a pick digs only the ore within that many rock radii', (t) => {
  setPickReach(1);
  t.after(() => setPickReach(PICK_REACH));
  const s = withDrill();
  const d = drills(s)[0];
  const rock = s.slots[0].rock!;
  const at = rimPos(0, d.angle);
  const def = SLOTS[0];
  const far = (k: number) =>
    Math.hypot(
      ((k % rock.w) - (rock.r + 1)) * CELL + def.x - at.x,
      (Math.floor(k / rock.w) - (rock.r + 1)) * CELL + def.y - at.y
    ) / CELL;
  const near = new Set(rock.cells.flatMap((c, k) => (c === COPPER && far(k) <= rock.r ? [k] : [])));
  const beyond = rock.cells.filter((c, k) => c === COPPER && !near.has(k)).length;
  assert.ok(near.size > 0 && beyond > 0, `${near.size} near, ${beyond} beyond`);
  setPick(s, d.id, COPPER);
  const cells: number[] = [];
  while (cells.length < near.size) {
    step(s);
    for (const e of s.events) if (e.type === 'break' && e.by === 'drill') cells.push(e.cell);
    s.events.length = 0;
  }
  // It digs the copper in reach first, every cell of it, and none beyond.
  assert.deepEqual(new Set(cells.slice(0, near.size)), near);
});

test('with the switch off a drill digs as if it had no pick, and keeps the pick', () => {
  const a = withDrill(2);
  const b = withDrill(2);
  setPick(b, drills(b)[0].id, ICE);
  setOrePicks(b, false);
  assert.equal(drills(b)[0].pick, ICE);
  assert.deepEqual(dig(a, 30 * 60), dig(b, 30 * 60));
});

test('the dig preview follows the pick', () => {
  const s = withDrill();
  const rock = s.slots[0].rock!;
  const at = rimPos(0, 0);
  const n = rock.cells.filter((c) => c === COPPER).length;
  const cells = firstCells(0, rock, at, n + 2, COPPER);
  assert.ok(cells.slice(0, n).every((k) => rock.cells[k] === COPPER));
  assert.ok(cells.slice(n).every((k) => rock.cells[k] !== COPPER));
});

test('picks are copper to crystal; a bad pick is refused without changing the drill', () => {
  const s = withDrill();
  const d = drills(s)[0];
  for (const bad of [ROCK, 0, 6, 2.5, NaN] as Ore[]) assert.equal(setPick(s, d.id, bad), 'invalid');
  assert.equal(d.pick, undefined);
  assert.equal(setPick(s, 9999, COPPER), 'invalid');
  assert.equal(setPick(s, d.id, CRYSTAL), true);
  assert.equal(d.pick, CRYSTAL);
});

test('a pick survives a respawn and a save; a malformed saved pick loads as none', () => {
  const s = withDrill();
  const d = drills(s)[0];
  setPick(s, d.id, COPPER);
  const rock = s.slots[0].rock;
  for (let t = 0; t < 30 * 600 && s.slots[0].rock === rock; t++) dig(s, 1);
  assert.notEqual(s.slots[0].rock, rock, 'the rock was replaced');
  assert.equal(drills(s)[0].pick, COPPER);
  const back = deserialize(serialize(s))!;
  assert.equal(drills(back)[0].pick, COPPER);
  for (const bad of [1, 7, 'copper', null]) {
    const raw = JSON.parse(serialize(s));
    raw.machines.find((m: { kind: string }) => m.kind === 'drill').pick = bad;
    const loaded = deserialize(JSON.stringify(raw));
    assert.ok(loaded, String(bad));
    assert.equal(drills(loaded)[0].pick, undefined, String(bad));
  }
});
