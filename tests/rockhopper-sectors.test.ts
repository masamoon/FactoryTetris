import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASSIC_SLOTS, SLOTS, TICK_HZ } from '../src/rockhopper/config';
import { sectorSlots, useSector } from '../src/rockhopper/sector';
import { freshState, generateRock, run, step } from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

test('a sector is the same for the same seed and differs between seeds', () => {
  assert.deepEqual(sectorSlots(42), sectorSlots(42));
  const a = sectorSlots(42),
    b = sectorSlots(43);
  assert.ok(a.some((d, i) => d.x !== b[i].x || d.y !== b[i].y));
});

test('sectors keep tiers, radii, prices and the copper first rock', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const defs = sectorSlots(seed);
    defs.forEach((d, i) => {
      const c = CLASSIC_SLOTS[i];
      assert.equal(d.tier, c.tier);
      assert.equal(d.r, c.r);
      assert.equal(d.price, c.price);
    });
    assert.equal(defs[0].signature, CLASSIC_SLOTS[0].signature);
    // Signatures only swap within a tier.
    for (const t of [1, 2, 3, 4]) {
      const sig = (xs: readonly { tier: number; signature: number }[]) =>
        xs
          .filter((d) => d.tier === t)
          .map((d) => d.signature)
          .sort();
      assert.deepEqual(sig(defs), sig(CLASSIC_SLOTS));
    }
  }
});

test('the classic field is untouched when sectors are off', () => {
  const s = freshState(7, false);
  assert.deepEqual(
    SLOTS.map((d) => ({ ...d })),
    CLASSIC_SLOTS.map((d) => ({ ...d }))
  );
  assert.equal(s.sector, false);
});

test('a state simulates on its own field, even after another layout was loaded', () => {
  const sec = freshState(9, true);
  const at = { x: SLOTS[0].x, y: SLOTS[0].y };
  freshState(1, false);
  assert.equal(SLOTS[0].x, CLASSIC_SLOTS[0].x);
  step(sec);
  assert.deepEqual({ x: SLOTS[0].x, y: SLOTS[0].y }, at);
});

test('a sector save round-trips onto the same field', () => {
  const s = freshState(1234, true);
  run(s, 5 * TICK_HZ);
  const text = serialize(s);
  freshState(1, false);
  const back = deserialize(text)!;
  assert.ok(back);
  assert.equal(back.sector, true);
  assert.equal(back.seed, 1234);
  assert.deepEqual(back.slots[0].rock!.cells, s.slots[0].rock!.cells);
  assert.equal(SLOTS[0].x, sectorSlots(1234)[0].x);
});

test('saves from before sectors load on the classic field', () => {
  const s = freshState(5, false);
  const raw = JSON.parse(serialize(s));
  delete raw.sector;
  const back = deserialize(JSON.stringify(raw))!;
  assert.equal(back.sector, false);
  assert.equal(SLOTS[3].x, CLASSIC_SLOTS[3].x);
});

test("a sector slot's veins stay put across respawns", () => {
  useSector(77, true);
  for (let i = 0; i < SLOTS.length; i++) {
    const a = generateRock(i, 0, 77),
      b = generateRock(i, 3, 77);
    // Cells that are inside both rocks: most keep their ore.
    let both = 0,
      same = 0;
    a.cells.forEach((c, k) => {
      if (c && b.cells[k]) {
        both++;
        if (c > 1 === b.cells[k] > 1) same++;
      }
    });
    assert.ok(same / both > 0.8, `slot ${i}: ${same}/${both}`);
  }
  useSector(1, false);
});

test('sector rocks stay inside the classic grid and keep the tier ore share', () => {
  useSector(31, true);
  for (let i = 0; i < SLOTS.length; i++) {
    const rock = generateRock(i, 0, 31);
    assert.equal(rock.w, 2 * SLOTS[i].r + 3);
    assert.ok(rock.total > 0.6 * Math.PI * SLOTS[i].r ** 2);
  }
  useSector(1, false);
});
