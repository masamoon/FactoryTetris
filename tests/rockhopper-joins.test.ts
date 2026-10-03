import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  beltPath,
  buildDrill,
  canTarget,
  drills,
  freshState,
  joinLinkWhy,
  joins,
  linkToJoin,
  pathLength,
  pointAlong,
  route,
  sell,
  setJoins,
  step,
  widen,
  type Point,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/** Two drills on the first rock, each on its own dock, joins switched on. */
function pair() {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  setJoins(s, true);
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  const [a, b] = drills(s);
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  return { s, a, b };
}

/** Link `id` into the belt `owner` has, at the first spot along it that works. */
function joinOnto(s: State, id: number, owner: number): Point | null {
  const m = s.machines.find((x) => x.id === owner)!;
  const path = beltPath(s, m)!;
  const L = pathLength(path);
  for (let f = 0.15; f < 0.95; f += 0.02) {
    const q = pointAlong(path, L * f);
    const p = { x: q.x, y: q.y };
    if (joinLinkWhy(s, id, p, owner) === '' && linkToJoin(s, id, p, owner) === true) return p;
  }
  return null;
}

/** Bundles delivered per second, per dock, with every drill's buffer kept full. */
function delivered(s: State, seconds = 30) {
  const got = new Map<number, number>();
  for (let i = 0; i < (seconds + 8) * TICK_HZ; i++) {
    for (const d of drills(s)) d.buffer = [2, 2, 2, 2];
    step(s);
    if (i >= 8 * TICK_HZ)
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1 / seconds);
    s.events.length = 0;
  }
  return got;
}

test('joins are off by default and refused while off', () => {
  const s = freshState(1);
  s.credits = 1e9;
  buildDrill(s, 0, Math.PI * 0.6);
  const [a] = drills(s);
  assert.equal(s.joins, undefined);
  assert.equal(linkToJoin(s, a.id, { x: -150, y: -120 }), 'unavailable');
  assert.equal(joins(s).length, 0);
});

test('a link dropped on another belt joins it there: both lines merge onto one belt', () => {
  const { s, a, b } = pair();
  const dock = b.out!.to;
  const at = joinOnto(s, a.id, b.id);
  assert.ok(at, 'somewhere on b’s belt takes a join');
  const [j] = joins(s);
  assert.deepEqual(a.out!.to, { kind: 'join', id: j.id });
  assert.deepEqual(b.out!.to, { kind: 'join', id: j.id });
  assert.deepEqual(j.out!.to, dock, 'the join carries on to b’s old dock');
  assert.equal(j.spent, 0, 'joins are free');
  // Both drills share one tier-1 belt from the join: it runs full.
  const rate = [...delivered(s).values()].reduce((x, y) => x + y, 0);
  assert.ok(rate > beltCapacity(1) - 0.2, `${rate}`);
  // Widen both feeds: the join's belt takes the widest input's tier.
  assert.equal(widen(s, a.id), true);
  assert.equal(widen(s, b.id), true);
  for (let i = 0; i < TICK_HZ; i++) step(s);
  assert.equal(j.tier, 2);
});

test('a link dropped on open space makes a hinge; dragging on from it reaches a dock', () => {
  const { s, a } = pair();
  assert.equal(linkToJoin(s, a.id, { x: -150, y: -120 }), true);
  const [j] = joins(s);
  assert.equal(j.out, null, 'a hinge waits for the player');
  step(s);
  assert.equal(j.out, null, 'a hinge never auto-links');
  const t = { kind: 'dock', index: 3 } as const;
  assert.ok(canTarget(s, j, t));
  assert.equal(route(s, j.id, t), true);
  // The belt turns at the hinge: a's belt and the hinge's meet at an angle.
  const p = beltPath(s, a)!,
    q = beltPath(s, j)!;
  const u = { x: p[1].x - p[0].x, y: p[1].y - p[0].y };
  const v = { x: q[1].x - q[0].x, y: q[1].y - q[0].y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  assert.ok(cos < 0.99, 'it bends');
  assert.ok((delivered(s).get(3) ?? 0) > 0.5, 'ore arrives through the hinge');
});

test('selling a join heals the line; loops and bad spots are refused and change nothing', () => {
  const { s, a, b } = pair();
  const dock = b.out!.to;
  assert.ok(joinOnto(s, a.id, b.id));
  const [j] = joins(s);
  // The join's own output can't come back into the line it feeds.
  assert.equal(joinLinkWhy(s, j.id, { x: -150, y: -120 }, b.id), 'makes a loop');
  const before = serialize(s);
  assert.notEqual(linkToJoin(s, b.id, { x: 0, y: 0 }), true, 'over the hub');
  assert.equal(serialize(s), before, 'a refusal changes nothing');
  assert.equal(sell(s, j.id), true);
  assert.equal(joins(s).length, 0);
  // The line heals: both drills reach b's old dock again (one through the other, as a junction).
  for (const m of [a, b]) {
    let t = m.out?.to;
    for (let k = 0; t && t.kind !== 'dock' && k < 4; k++)
      t = s.machines.find((x) => x.id === (t as { id: number }).id)?.out?.to;
    assert.deepEqual(t, dock);
  }
});

test('joins and hinges survive a save round-trip', () => {
  const { s, a, b } = pair();
  assert.ok(joinOnto(s, a.id, b.id));
  buildDrill(s, 0, Math.PI * 1.5);
  const c = drills(s).at(-1)!;
  assert.equal(linkToJoin(s, c.id, { x: 150, y: -160 }), true);
  const back = deserialize(serialize(s))!;
  assert.ok(back, 'loads');
  assert.equal(back.joins, true);
  assert.deepEqual(
    back.machines.map((m) => [m.kind, m.out?.to ?? null]),
    s.machines.map((m) => [m.kind, m.out?.to ?? null])
  );
});

test('a join whose last input leaves goes away, freeing its dock', () => {
  const { s, a } = pair();
  assert.equal(linkToJoin(s, a.id, { x: -150, y: -120 }), true);
  const [j] = joins(s);
  const t = { kind: 'dock', index: 3 } as const;
  assert.equal(route(s, j.id, t), true);
  // a goes straight to a dock again: the hinge has nothing left to carry.
  assert.equal(route(s, a.id, { kind: 'dock', index: 5 }), true);
  assert.equal(joins(s).length, 0);
  assert.ok(canTarget(s, a, t) || a.out!.to.kind === 'dock', 'dock 3 is free again');
  assert.ok(!s.machines.some((m) => m.out?.to.kind === 'dock' && m.out.to.index === 3));
});
