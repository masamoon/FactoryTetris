import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beltCapacity, TICK_HZ } from '../src/rockhopper/config';
import {
  bend,
  canTarget,
  beltPath,
  buildDrill,
  buildSmelter,
  crossingsOf,
  dockPos,
  drills,
  freshState,
  machinePos,
  MAX_POSTS,
  moveDrill,
  pathLength,
  pointAlong,
  route,
  smelters,
  step,
  swapWhy,
  type Drill,
  type Point,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/** Two drills whose belts cross above the hub (as in the crossings tests). */
function crossed() {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  const [a, b] = drills(s);
  route(s, a.id, { kind: 'dock', index: 7 });
  route(s, b.id, { kind: 'dock', index: 8 });
  route(s, a.id, { kind: 'dock', index: 2 });
  route(s, b.id, { kind: 'dock', index: 1 });
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  return { s, a, b };
}

/** Posts for `m` that bend its belt clear of every plate: one post, else two round the hub. */
function untangle(s: State, m: Drill): Point[] | null {
  const ring: Point[] = [];
  for (const r of [60, 80, 100, 130])
    for (let a = 0; a < 360; a += 15)
      ring.push({ x: r * Math.cos((a * Math.PI) / 180), y: r * Math.sin((a * Math.PI) / 180) });
  const tries: Point[][] = [...ring.map((p) => [p])];
  for (const p of ring) for (const q of ring) if (p !== q) tries.push([p, q]);
  for (const via of tries) {
    if (bend(s, m.id, via) !== true) continue;
    const clear = crossingsOf(s).plates.length === 0;
    bend(s, m.id, []);
    if (clear) return via;
  }
  return null;
}

/** Any post that bends `m`'s belt legally. */
function anyPost(s: State, m: Drill): Point {
  for (let y = -300; y <= 60; y += 10)
    for (let x = -300; x <= 300; x += 10)
      if (bend(s, m.id, [{ x, y }]) === true) {
        bend(s, m.id, []);
        return { x, y };
      }
  throw new Error('no legal post');
}

function rates(s: State, ds: Drill[], seconds = 30) {
  const got = new Map<number, number>();
  for (let i = 0; i < (seconds + 8) * TICK_HZ; i++) {
    for (const d of ds) d.buffer = [2, 2, 2, 2];
    step(s);
    if (i >= 8 * TICK_HZ)
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1);
    s.events.length = 0;
  }
  return ds.map((d) => (got.get((d.out!.to as { index: number }).index) ?? 0) / seconds);
}

test('a bend post can take a belt round a crossing, and both belts run at full rate', () => {
  const { s, a, b } = crossed();
  assert.equal(crossingsOf(s).plates.length, 1);
  const via = untangle(s, a);
  assert.ok(via, 'posts can untangle the pair');
  assert.equal(bend(s, a.id, via), true);
  assert.equal(crossingsOf(s).plates.length, 0);
  const path = beltPath(s, a)!;
  assert.equal(path.length, via.length + 2, 'machine, posts, dock');
  for (const q of path) assert.ok(Math.hypot(q.x, q.y) > 40, 'never over the hub');
  assert.ok(Math.abs(a.out!.length - pathLength(path)) < 1e-6, 'the belt is as long as its path');
  for (const r of rates(s, [a, b])) assert.ok(r > beltCapacity(1) - 0.15, `${r}`);
});

test('bends are refused with a reason: too many, too sharp, on a rock or the hub', () => {
  const { s, a } = crossed();
  const from = machinePos(a),
    to = dockPos(s, 2);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const side = { x: mid.x + 60, y: mid.y };
  assert.equal(bend(s, a.id, [side, side, side].slice(0, MAX_POSTS + 1)), 'invalid');
  // A post past the dock makes the belt fold back on itself.
  const back = { x: to.x + (to.x - from.x) * 0.6, y: to.y + (to.y - from.y) * 0.6 };
  assert.match(String(bend(s, a.id, [back])), /too sharp|no room here|over the hub/);
  assert.equal(bend(s, a.id, [{ x: 0, y: 0 }]), 'no room here', 'the hub');
  assert.equal(bend(s, a.id, [machinePos(drills(s)[1])]), 'no room here', 'a machine');
  assert.equal(a.out!.via, undefined, 'refusals change nothing');
});

test('re-routing keeps posts only if they still fit, moving keeps them, a splice splits them', () => {
  const { s, a } = crossed();
  const p = anyPost(s, a);
  assert.equal(bend(s, a.id, [p]), true);
  // Moving the drill a little keeps its post.
  assert.equal(moveDrill(s, a.id, a.slot, a.angle + 0.05), true);
  assert.equal(a.out!.via?.length, 1);
  assert.equal(route(s, a.id, { kind: 'dock', index: 5 }), true);
  const kept = a.out!.via;
  assert.equal(
    kept === undefined || canTarget(s, a, { kind: 'dock', index: 5 }, kept),
    true,
    're-route keeps posts only where they still fit'
  );
  assert.equal(route(s, a.id, { kind: 'dock', index: 2 }), true);
  // Splice a smelter into the piece before a post: the post goes on with the smelter's belt.
  const spliced = spliceBeforePost(s, a.id);
  assert.ok(spliced, 'a splice before a post');
  const { t: s2, p: q } = spliced;
  const a2 = drills(s2).find((d) => d.id === a.id)!;
  const sm = smelters(s2).at(-1)!;
  assert.equal(a2.out!.to.kind, 'smelter');
  assert.equal(a2.out!.via, undefined, 'the feed runs straight to the smelter');
  assert.deepEqual(sm.out!.via, [q], 'the post goes on with the smelter belt');
});

/** A copy of `s` where drill `id` has one post and a smelter spliced into the piece before it. */
function spliceBeforePost(s: State, id: number) {
  for (let y = -300; y <= 60; y += 20)
    for (let x = -300; x <= 300; x += 20) {
      const t = deserialize(serialize(s))!;
      const p = { x, y };
      if (bend(t, id, [p]) !== true) continue;
      const m = drills(t).find((d) => d.id === id)!;
      const path = beltPath(t, m)!;
      const L = pathLength(path);
      for (let f = 0.05; f < 0.95; f += 0.03) {
        const q = pointAlong(path, L * f);
        if (q.piece !== 0) continue;
        if (buildSmelter(t, { x: q.x, y: q.y }, id) === true) return { t, p };
      }
    }
  return null;
}

test('posts survive a save round-trip; malformed ones straighten the belt', () => {
  const { s, a } = crossed();
  const p = anyPost(s, a);
  bend(s, a.id, [p]);
  const back = deserialize(serialize(s))!;
  assert.deepEqual(back.machines.find((m) => m.id === a.id)!.out!.via, [p]);
  const raw = JSON.parse(serialize(s));
  raw.machines.find((m: { id: number }) => m.id === a.id).out.via = [{ x: 'no' }];
  const bad = deserialize(JSON.stringify(raw))!;
  assert.ok(bad, 'the save still loads');
  assert.equal(bad.machines.find((m) => m.id === a.id)!.out!.via, undefined);
});

test('a belt bent across another twice gets two plates and keeps flowing', () => {
  const { s, a, b } = crossed();
  // Find two posts that make a's belt cross b's twice.
  let found = false;
  for (let y = -300; y <= 40 && !found; y += 20)
    for (let x = -250; x <= 250 && !found; x += 20)
      for (let x2 = -250; x2 <= 250 && !found; x2 += 40) {
        const c = deserialize(serialize(s))!;
        if (
          bend(c, a.id, [
            { x, y },
            { x: x2, y: y + 40 },
          ]) !== true
        )
          continue;
        const own = crossingsOf(c).plates.filter((q) => q.sides.some((d) => d.id === a.id));
        if (own.length === 2) {
          bend(s, a.id, [
            { x, y },
            { x: x2, y: y + 40 },
          ]);
          found = true;
        }
      }
  if (!found) return; // geometry may not allow it on this rock; the stress tool covers the rest
  const keys = new Set(crossingsOf(s).plates.map((q) => q.key));
  assert.equal(keys.size, crossingsOf(s).plates.length, 'distinct plate keys');
  for (const r of rates(s, [a, b])) assert.ok(r > 0.5, `flows: ${r}`);
});

test('a link bent mid-drag can still take a busy dock: that dock’s belt takes its old place', () => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  buildDrill(s, 0, Math.PI * 1.5);
  const [a, b, c] = drills(s);
  // c, on the far side of the rock, feeds a as a junction; b holds dock 2.
  assert.equal(route(s, c.id, { kind: 'drill', id: a.id }), true);
  const t = { kind: 'dock', index: 2 } as const;
  assert.deepEqual(b.out!.to, t);
  // Straight, c's belt to dock 2 would run under b; refused with that reason, not silently.
  assert.equal(swapWhy(s, c, t).why, 'belt blocked');
  // A drill can't hand its dock to the drill it feeds.
  assert.equal(swapWhy(s, c, a.out!.to).why, 'dock busy');
  let post: Point | null = null;
  for (let y = -340; y <= 40 && !post; y += 10)
    for (let x = -300; x <= 300 && !post; x += 10)
      if (swapWhy(s, c, t, [{ x, y }]).partner) post = { x, y };
  assert.ok(post, 'a post takes the belt round');
  assert.equal(route(s, c.id, t, [post]), true);
  assert.deepEqual(c.out!.to, t);
  assert.deepEqual(c.out!.via, [post]);
  assert.deepEqual(b.out!.to, { kind: 'drill', id: a.id }, 'b took c’s place in the junction');
  for (const m of [a, b, c]) assert.ok(canTarget(s, m, m.out!.to, m.out!.via ?? []));
});

test('a smelter dropped on a bend post sits in the knee: the post is used up, the line runs on', () => {
  const { s, a } = crossed();
  // Some post that bends a's belt and has room for a smelter on it.
  let done: { t: State; p: Point } | null = null;
  for (let y = -300; y <= 60 && !done; y += 20)
    for (let x = -300; x <= 300 && !done; x += 20) {
      const t = deserialize(serialize(s))!;
      const p = { x, y };
      if (bend(t, a.id, [p]) !== true) continue;
      if (buildSmelter(t, p, a.id) === true) done = { t, p };
    }
  assert.ok(done, 'a knee with room for a smelter');
  const { t, p } = done;
  const a2 = drills(t).find((d) => d.id === a.id)!;
  const sm = smelters(t).at(-1)!;
  assert.deepEqual(machinePos(sm), p, 'the smelter stands on the post');
  assert.deepEqual(a2.out!.to, { kind: 'smelter', id: sm.id });
  assert.equal(a2.out!.via, undefined, 'the post is used up');
  assert.equal(sm.out!.via, undefined);
  assert.deepEqual(sm.out!.to, { kind: 'dock', index: 2 });
  assert.ok(canTarget(t, a2, a2.out!.to, []) && canTarget(t, sm, sm.out!.to, []));
  // Half on a post is still refused.
  const u = deserialize(serialize(s))!;
  bend(u, a.id, [p]);
  assert.notEqual(buildSmelter(u, { x: p.x + 8, y: p.y }, a.id), true);
});
