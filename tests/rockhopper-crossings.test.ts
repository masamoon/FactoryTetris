import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beltCapacity, SMELTER_RADIUS, TICK_HZ } from '../src/rockhopper/config';
import {
  buildDrill,
  buildSmelter,
  canTarget,
  crossingsOf,
  dockPos,
  drills,
  drillSpotWhy,
  freshState,
  machinePos,
  relayout,
  rimPos,
  route,
  run,
  setCrossings,
  smelterSpotWhy,
  step,
  targetWhy,
  widen,
  type Drill,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

/**
 * Two drills on the first rock, each routed to a dock on the far side of the other so their
 * belts cross above the hub. Their rock is removed: only chunks fed in below move.
 */
function crossed(angA: number, angB: number, dockA = 2, dockB = 1, on = true) {
  const s = freshState(1);
  s.crossings = on;
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, angA);
  buildDrill(s, 0, angB);
  const [a, b] = drills(s);
  route(s, a.id, { kind: 'dock', index: 7 });
  route(s, b.id, { kind: 'dock', index: 8 });
  assert.equal(route(s, a.id, { kind: 'dock', index: dockA }), true);
  assert.equal(route(s, b.id, { kind: 'dock', index: dockB }), true);
  s.slots[0].rock = null;
  s.slots[0].arriveAt = 1e9;
  return { s, a, b };
}

/** Chunks per second delivered at each drill's dock, feeding `rate` chunks/s into each drill. */
function rates(s: State, ds: Drill[], rate: number, seconds = 40) {
  const got = new Map<number, number>();
  let acc = 0;
  for (let i = 0; i < (seconds + 5) * TICK_HZ; i++) {
    acc += rate / TICK_HZ;
    for (const d of ds) {
      if (rate === Infinity) d.buffer = [2, 2, 2, 2];
      else if (acc >= 1 && d.buffer.length < 4) d.buffer.push(2);
    }
    if (acc >= 1) acc -= 1;
    step(s);
    if (i >= 5 * TICK_HZ)
      for (const e of s.events)
        if (e.type === 'deliver') got.set(e.dock, (got.get(e.dock) ?? 0) + 1);
    s.events.length = 0;
  }
  return ds.map((d) => (got.get((d.out!.to as { index: number }).index) ?? 0) / seconds);
}

const ANGLES: [number, number][] = [
  [Math.PI, 0],
  [Math.PI * 0.6, Math.PI * 0.4],
  [Math.PI * 0.9, Math.PI * 0.55],
];

test('two saturated belts that cross each keep half their bundles, at any angle', () => {
  const seen = new Set<string>();
  for (const [angA, angB] of ANGLES) {
    const { s, a, b } = crossed(angA, angB);
    const x = crossingsOf(s);
    assert.equal(x.plates.length, 1, 'one plate');
    seen.add((x.plates[0].angle * 57.3).toFixed(0));
    const [ra, rb] = rates(s, [a, b], Infinity);
    const half = beltCapacity(1) / 2;
    for (const r of [ra, rb]) assert.ok(Math.abs(r - half) < 0.35, `${ra} / ${rb} vs ${half}`);
  }
  assert.ok(seen.size >= 2, `several angles: ${[...seen]}`);
});

test('lightly loaded belts cross without loss; switched off, crossings cost nothing', () => {
  for (const [angA, angB] of ANGLES) {
    const { s, a, b } = crossed(angA, angB);
    for (const r of rates(s, [a, b], 3)) assert.ok(r > 2.9, `3/s in, ${r} out`);
    const off = crossed(angA, angB, 2, 1, false);
    assert.equal(crossingsOf(off.s).plates.length, 0);
    for (const r of rates(off.s, [off.a, off.b], Infinity))
      assert.ok(r > beltCapacity(1) - 0.1, `off: ${r}`);
  }
});

test('widening a crossed belt carries more chunks, not more bundles', () => {
  const { s, a, b } = crossed(Math.PI, 0);
  widen(s, a.id);
  widen(s, b.id);
  const [ra, rb] = rates(s, [a, b], Infinity);
  // Half the bundles of a tier-2 belt: as much as an uncrossed tier-1 belt.
  for (const r of [ra, rb]) assert.ok(Math.abs(r - beltCapacity(1)) < 0.5, `${ra} / ${rb}`);
});

test('turns alternate: a stream of bundles never starves the other belt', () => {
  // One belt saturated, the other trickling: the trickle still gets through at its rate.
  const { s, a, b } = crossed(Math.PI * 0.9, Math.PI * 0.55);
  const got = new Map<number, number>();
  for (let i = 0; i < 40 * TICK_HZ; i++) {
    a.buffer = [2, 2, 2, 2];
    if (i % 15 === 0 && b.buffer.length < 4) b.buffer.push(3);
    step(s);
    for (const e of s.events) if (e.type === 'deliver') got.set(e.ore, (got.get(e.ore) ?? 0) + 1);
    s.events.length = 0;
    for (const m of [a, b]) for (const it of m.out!.items) assert.ok((it.w ?? 0) < 20, 'waits');
  }
  assert.ok((got.get(3) ?? 0) / 40 > 1.9, `trickle ${(got.get(3) ?? 0) / 40}/s`);
  assert.ok((got.get(2) ?? 0) / 40 > beltCapacity(1) * 0.6, `stream ${(got.get(2) ?? 0) / 40}/s`);
});

test('tangled random factories never deadlock', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = freshState(seed);
    s.credits = 1e9;
    s.docks = 9;
    s.slots.forEach((slot) => (slot.unlocked = true));
    let r = seed * 7919;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 14; i++) buildDrill(s, Math.floor(rnd() * 3), rnd() * Math.PI * 2);
    const ds = drills(s);
    // Scramble every dock link, bypassing the lane rule, like a save from before crossings.
    const docks = [...Array(9).keys()].sort(() => rnd() - 0.5);
    ds.forEach((d, i) => {
      if (i < 9) d.out = { to: { kind: 'dock', index: docks[i] }, length: 1, items: [] };
      else if (canTarget(s, d, { kind: 'drill', id: ds[i - 9].id }))
        d.out = { to: { kind: 'drill', id: ds[i - 9].id }, length: 1, items: [] };
    });
    relayout(s);
    for (const d of ds) if (d.out && d.out.length === 1) relayout(s);
    s.machines.forEach((m) => m.out && (m.out.length = Math.max(m.out.length, 1)));
    assert.ok(crossingsOf(s).plates.length >= 3, `seed ${seed}: tangled`);
    const d0 = s.stats.delivered;
    let worst = 0;
    for (let t = 0; t < 120 * TICK_HZ; t++) {
      step(s);
      s.events.length = 0;
      for (const m of s.machines)
        for (const it of m.out?.items ?? []) worst = Math.max(worst, it.w ?? 0);
    }
    assert.ok(worst < 4 * TICK_HZ, `seed ${seed}: a bundle waited ${worst} ticks`);
    assert.ok(s.stats.delivered - d0 > 1000, `seed ${seed}: deliveries kept flowing`);
  }
});

test('belts that share a machine only cross away from it', () => {
  const s = freshState(1);
  s.credits = 1e9;
  // The smelter first, below the rock: the drills' belts converge on it from either side.
  assert.equal(buildSmelter(s, { x: 0, y: -115 }), true);
  buildDrill(s, 0, Math.PI * 0.4);
  buildDrill(s, 0, Math.PI * 0.6);
  const [a, b] = drills(s);
  const sm = s.machines.find((m) => m.kind === 'smelter')!;
  assert.equal(route(s, a.id, { kind: 'smelter', id: sm.id }), true);
  assert.equal(route(s, b.id, { kind: 'smelter', id: sm.id }), true);
  assert.equal(crossingsOf(s).plates.length, 0, 'two inputs of one smelter never cross');
});

test('belts never run under machines: links and moves that would are refused', () => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI / 2);
  const d = drills(s)[0];
  // Halfway down the drill's belt to the hub: a smelter can't stand there, or move there.
  const p = machinePos(d);
  const mid = { x: p.x * 0.55, y: p.y * 0.55 };
  assert.equal(smelterSpotWhy(s, mid), 'on a belt');
  assert.equal(buildSmelter(s, mid), 'blocked');
  // Switched off, the lane rule goes too.
  setCrossings(s, false);
  assert.equal(smelterSpotWhy(s, mid), '');
  setCrossings(s, true);
  // A smelter off to the side; then find a rim spot whose belt to dock 1 would run under it.
  assert.equal(buildSmelter(s, { x: -40, y: -125 }), true);
  const sm = s.machines.find((m) => m.kind === 'smelter')!;
  let blocked = 0;
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    if (drillSpotWhy(s, 0, a)) continue;
    assert.equal(buildDrill(s, 0, a), true);
    const x = drills(s)[drills(s).length - 1];
    for (let k = 3; k < 9; k++) {
      const q = dockPos(k),
        r = rimPos(0, a),
        dx = q.x - r.x,
        dy = q.y - r.y;
      const u = Math.max(
        0,
        Math.min(1, ((sm.x - r.x) * dx + (sm.y - r.y) * dy) / (dx * dx + dy * dy))
      );
      const under = Math.hypot(sm.x - r.x - dx * u, sm.y - r.y - dy * u) < SMELTER_RADIUS - 4;
      const used = s.machines.some((m) => m.out?.to.kind === 'dock' && m.out.to.index === k);
      if (!under || used) continue;
      const t = { kind: 'dock' as const, index: k };
      assert.equal(targetWhy(s, x, t), 'belt blocked');
      assert.equal(route(s, x.id, t), 'invalid');
      blocked++;
    }
    s.machines = s.machines.filter((m) => m !== x);
  }
  assert.ok(blocked > 0, 'some rim spot routes under the smelter');
});

test('waiting bundles and the switch survive a save round-trip', () => {
  const { s, a, b } = crossed(Math.PI, 0);
  for (let i = 0; i < 6 * TICK_HZ; i++) {
    a.buffer = [2, 2, 2, 2];
    b.buffer = [2, 2, 2, 2];
    step(s);
    s.events.length = 0;
  }
  assert.ok(
    s.machines.some((m) => m.out!.items.some((it) => (it.w ?? 0) > 0)),
    'someone waits'
  );
  const c = deserialize(serialize(s))!;
  run(s, 5 * TICK_HZ);
  run(c, 5 * TICK_HZ);
  s.events.length = c.events.length = 0;
  assert.equal(serialize(s), serialize(c));
  // A save from before crossings turns them on and says so once.
  const old = JSON.parse(serialize(s)) as Record<string, unknown>;
  delete old.crossings;
  const loaded = deserialize(JSON.stringify(old))!;
  assert.equal(loaded.crossings, true);
  assert.equal(loaded.crossingsNotice, true);
  assert.equal(deserialize(serialize(loaded))!.crossingsNotice, undefined);
  setCrossings(loaded, false);
  assert.equal(deserialize(serialize(loaded))!.crossings, false);
});
