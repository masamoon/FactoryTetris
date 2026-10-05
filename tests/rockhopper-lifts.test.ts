import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  beltPath,
  buildDrill,
  crossingsOf,
  drills,
  freshState,
  isRaised,
  liftsFree,
  lowerPiece,
  raisePiece,
  route,
  setCrossings,
  setFactories,
  setResearch,
  step,
  type Drill,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/** Two drills whose belts cross above the hub (as in the crossings tests), research on, 2 lifts. */
function crossed(lifts = 2) {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  setFactories(s, true);
  assert.equal(setResearch(s, true), true);
  s.research!.lifts.owned = lifts;
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  const [a, b] = drills(s);
  route(s, a.id, { kind: 'dock', index: 7 });
  route(s, b.id, { kind: 'dock', index: 8 });
  assert.equal(route(s, a.id, { kind: 'dock', index: 2 }), true);
  assert.equal(route(s, b.id, { kind: 'dock', index: 1 }), true);
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  return { s, a, b };
}

/** Bundles per second at each drill's dock, with every buffer kept full. */
function rates(s: State, ds: Drill[], seconds = 30) {
  const got = new Map<number, number>();
  for (let i = 0; i < (seconds + 5) * TICK_HZ; i++) {
    for (const d of ds) d.buffer = [2, 2, 2, 2];
    step(s);
    if (i >= 5 * TICK_HZ)
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1);
    s.events.length = 0;
  }
  return ds.map((d) => (got.get((d.out!.to as { index: number }).index) ?? 0) / seconds);
}

test('a lifted piece shares no plate with the ground, and its belt runs at full speed', () => {
  const { s, a, b } = crossed();
  assert.equal(crossingsOf(s).plates.length, 1);
  assert.equal(raisePiece(s, a.id, 0), true);
  assert.equal(crossingsOf(s).plates.length, 0);
  const [ra, rb] = rates(s, [a, b]);
  const full = beltCapacity(1);
  for (const r of [ra, rb]) assert.ok(Math.abs(r - full) < 0.4, `${ra} / ${rb} vs ${full}`);
});

test('two lifted pieces still cross each other: lifting everything gains nothing', () => {
  const { s, a, b } = crossed();
  assert.equal(raisePiece(s, a.id, 0), true);
  assert.equal(raisePiece(s, b.id, 0), true);
  assert.equal(crossingsOf(s).plates.length, 1);
});

test('lifts are limited to those owned, and lowering is free and returns the lift', () => {
  const { s, a, b } = crossed(1);
  assert.equal(raisePiece(s, a.id, 0), true);
  assert.equal(liftsFree(s), 0);
  assert.equal(raisePiece(s, b.id, 0), 'no lift to place');
  const credits = s.credits;
  assert.equal(lowerPiece(s, a.id, 0), true);
  assert.equal(liftsFree(s), 1);
  assert.equal(s.credits, credits);
  assert.equal(crossingsOf(s).plates.length, 1);
  assert.equal(raisePiece(s, a.id, 5), 'no belt here');
});

test('a lift returns when its piece changes: re-target, a post, a sale', () => {
  // Re-target.
  let c = crossed();
  assert.equal(raisePiece(c.s, c.a.id, 0), true);
  assert.equal(route(c.s, c.a.id, { kind: 'dock', index: 4 }), true);
  step(c.s);
  assert.equal(isRaised(c.s, c.a.id, 0), false);
  assert.ok(c.s.events.some((e) => e.type === 'lift' && e.returned));
  assert.equal(liftsFree(c.s), 2);
  // A post added on the belt renumbers its pieces: the lift returns.
  c = crossed();
  assert.equal(raisePiece(c.s, c.a.id, 0), true);
  const p = beltPath(c.s, c.a)!;
  const mid = { x: (p[0].x + p[1].x) / 2 + 12, y: (p[0].y + p[1].y) / 2 };
  assert.equal(route(c.s, c.a.id, c.a.out!.to, [mid]), true);
  step(c.s);
  assert.equal(isRaised(c.s, c.a.id, 0), false);
  // Selling the owner.
  c = crossed();
  assert.equal(raisePiece(c.s, c.b.id, 0), true);
  c.s.machines = c.s.machines.filter((m) => m.id !== c.b.id);
  step(c.s);
  assert.equal(liftsFree(c.s), 2);
  // Nothing changed: the lift stays through many ticks.
  c = crossed();
  assert.equal(raisePiece(c.s, c.a.id, 0), true);
  for (let i = 0; i < 300; i++) step(c.s);
  assert.equal(isRaised(c.s, c.a.id, 0), true);
});

test('with research or crossings off, raised pieces are inert but kept', () => {
  const { s, a } = crossed();
  assert.equal(raisePiece(s, a.id, 0), true);
  setResearch(s, false);
  setCrossings(s, true);
  assert.equal(crossingsOf(s).plates.length, 1, 'inert: the plate is back');
  for (let i = 0; i < 30; i++) step(s);
  assert.equal(isRaised(s, a.id, 0), true, 'kept while off');
  setResearch(s, true);
  assert.equal(crossingsOf(s).plates.length, 0);
  // A piece that changed while research was off returns once it is back on.
  setResearch(s, false);
  route(s, a.id, { kind: 'dock', index: 4 });
  setResearch(s, true);
  step(s);
  assert.equal(isRaised(s, a.id, 0), false);
  assert.equal(raisePiece(s, a.id, 0), true);
  assert.equal(setResearch(freshState(1), true), 'needs factories');
});

test('lifts survive a save round-trip; a malformed or stale field never breaks the save', () => {
  const { s, a } = crossed();
  assert.equal(raisePiece(s, a.id, 0), true);
  const back = deserialize(serialize(s))!;
  assert.ok(back);
  assert.deepEqual(back.research, s.research);
  assert.equal(crossingsOf(back).plates.length, 0);
  // A raised piece whose belt changed before saving returns on the first tick.
  const raw = JSON.parse(serialize(s));
  raw.research.lifts.raised[0].b = { x: 1, y: 2 };
  const stale = deserialize(JSON.stringify(raw))!;
  step(stale);
  assert.equal(isRaised(stale, a.id, 0), false);
  assert.equal(liftsFree(stale), 2);
  // Malformed: research resets to off and empty.
  for (const bad of [null, 3, { on: 'yes' }, { on: true, lifts: { owned: -1, raised: [] } }]) {
    const r = JSON.parse(serialize(s));
    r.research = bad;
    const t = deserialize(JSON.stringify(r))!;
    assert.ok(t, 'the save loads');
    assert.deepEqual(t.research, { on: false, lifts: { owned: 0, raised: [] } });
  }
  // A save without the field has no research.
  const r = JSON.parse(serialize(s));
  delete r.research;
  assert.equal(deserialize(JSON.stringify(r))!.research, undefined);
});
