/**
 * Stress for crossings (docs/ROCKHOPPER_CROSSINGS.md, C2): random factories built only with
 * legal commands (drills anywhere on the T1 rims, raw chains, spliced and standalone smelters,
 * random re-routes), drills upgraded until their belts saturate, optionally with machines moved
 * mid-run. Every run must keep delivering, no bundle may wait its turn longer than 4 s, and no
 * bundle may sit still for 20 s unless it is in a queue backed up from the machine at its belt's
 * end (a bundle held for room has its wait cleared, so a lock on one belt would pass the others).
 *
 *   npx tsx tools/rockhopper-crossings-stress.ts [seeds] [seconds]
 */
import { BELT_SPACING, SLOTS, TICK_HZ } from '../src/rockhopper/config';
import {
  beltEnds,
  bend,
  buildDrill,
  crossingsOf,
  buildSmelter,
  drills,
  freshState,
  moveDrill,
  moveSmelter,
  route,
  step,
  upgrade,
  type Machine,
  type State,
  type Target,
} from '../src/rockhopper/sim';

/**
 * Bundles on `m`'s belt in an unbroken queue from its end: backed up from the machine there. A
 * bundle held at a plate's near edge for room to exit leaves a plate-long gap in the queue.
 */
function backlog(s: State, m: Machine) {
  const out = new Set<object>();
  const items = [...m.out!.items].sort((a, b) => b.pos - a.pos);
  const gates = crossingsOf(s).gates.get(m.id) ?? [];
  let front = m.out!.length;
  for (const it of items) {
    const g = gates.find((g) => Math.abs(g.lo - it.pos) < 0.5);
    if (front - it.pos > BELT_SPACING + 1 + (g ? g.hi - g.lo : 0)) break;
    out.add(it);
    front = it.pos;
  }
  return out;
}

export interface StressResult {
  seed: number;
  machines: number;
  plates: number;
  worstWait: number;
  stalledWindows: number;
  /** Belts that ended the run with bend posts. */
  bent: number;
  /** Bundles that sat still 20 s outside a machine backlog. */
  locked: number;
  /** What each lock looked like when found, for debugging. */
  locks: string[];
}

export function stress(seed: number, seconds: number, moves: boolean, posts = false): StressResult {
  const s: State = freshState(seed);
  s.credits = 1e12;
  s.docks = 9;
  SLOTS.forEach((d, i) => {
    if (d.tier === 1 && !s.slots[i].unlocked) {
      s.slots[i].unlocked = true;
      s.slots[i].arriveAt = 0;
    }
  });
  step(s);
  let r = (seed * 2654435761) % 2147483647 || 1;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const n = 3 + Math.floor(rnd() * 8);
  for (let i = 0; i < n; i++) buildDrill(s, Math.floor(rnd() * 3), rnd() * Math.PI * 2);
  const sm = Math.floor(rnd() * 3);
  for (let i = 0; i < sm; i++) {
    // Spliced into a drill's belt, or standing alone in the yard.
    const ds = drills(s).filter((d) => d.out?.to.kind === 'dock');
    const d = ds[Math.floor(rnd() * ds.length)];
    const e = d && beltEnds(s, d);
    if (e && rnd() < 0.6) {
      const f = 0.3 + rnd() * 0.5;
      buildSmelter(s, { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f }, d.id);
    } else buildSmelter(s, { x: (rnd() - 0.5) * 400, y: -60 - rnd() * 140 });
  }
  const ms = s.machines;
  for (let k = 0; k < ms.length * 2; k++) {
    const m = ms[Math.floor(rnd() * ms.length)];
    const x = ms[Math.floor(rnd() * ms.length)];
    const t: Target =
      rnd() < 0.5
        ? { kind: 'dock', index: Math.floor(rnd() * 9) }
        : ({ kind: x.kind, id: x.id } as Target);
    route(s, m.id, t);
  }
  if (posts) {
    // Random bend posts (docs/ROCKHOPPER_BEND_POSTS.md): up to two on a belt, kept when legal.
    for (let k = 0; k < s.machines.length * 3; k++) {
      const m = ms[Math.floor(rnd() * ms.length)];
      if (!m.out) continue;
      const n = 1 + Math.floor(rnd() * 2);
      const via = Array.from({ length: n }, () => ({
        x: (rnd() - 0.5) * 560,
        y: 60 - rnd() * 420,
      }));
      bend(s, m.id, via);
    }
  }
  for (const d of drills(s))
    while (d.level < 3 + Math.floor(rnd() * 4) && upgrade(s, d.id) === true);
  let worst = 0,
    stalled = 0,
    last = 0;
  let plates = 0,
    locked = 0;
  const locks: string[] = [];
  const still = new Map<object, { pos: number; since: number }>();
  for (let t = 0; t < seconds * TICK_HZ; t++) {
    if (moves && t > 0 && t % (15 * TICK_HZ) === 0) {
      const m = s.machines[Math.floor(rnd() * s.machines.length)];
      if (m.kind === 'drill') moveDrill(s, m.id, m.slot, rnd() * Math.PI * 2);
      else moveSmelter(s, m.id, { x: (rnd() - 0.5) * 400, y: -60 - rnd() * 140 });
    }
    step(s);
    s.events.length = 0;
    plates = Math.max(plates, crossingsOf(s).plates.length);
    for (const m of s.machines)
      for (const it of m.out?.items ?? []) worst = Math.max(worst, it.w ?? 0);
    for (const m of s.machines) {
      if (!m.out) continue;
      const q = backlog(s, m);
      for (const it of m.out.items) {
        const was = still.get(it);
        if (!was || was.pos !== it.pos || q.has(it)) still.set(it, { pos: it.pos, since: t });
        else if (t - was.since === 20 * TICK_HZ) {
          locked++;
          const gates = crossingsOf(s).gates.get(m.id) ?? [];
          locks.push(
            `t=${t} ${m.kind} ${m.id}→${JSON.stringify(m.out.to)} len ${m.out.length.toFixed(1)} ` +
              `bundle at ${it.pos.toFixed(1)} w ${it.w ?? 0}; items ${m.out.items.map((x) => x.pos.toFixed(1)).join(',')}; ` +
              `gates ${gates.map((g) => `${g.lo.toFixed(1)}-${g.hi.toFixed(1)}`).join(',')}`
          );
        }
      }
    }
    if (t % (20 * TICK_HZ) === 20 * TICK_HZ - 1) {
      const moved = s.stats.delivered + s.stats.bars;
      if (t > 20 * TICK_HZ && moved === last && s.machines.some((m) => m.out?.items.length))
        stalled++;
      last = moved;
    }
  }
  return {
    seed,
    machines: s.machines.length,
    plates,
    worstWait: worst,
    stalledWindows: stalled,
    bent: s.machines.filter((m) => m.out?.via?.length).length,
    locked,
    locks,
  };
}

if (process.argv[1]?.includes('rockhopper-crossings-stress')) {
  const seeds = Number(process.argv[2] ?? 500);
  const seconds = Number(process.argv[3] ?? 150);
  let bad = 0,
    worst = 0,
    crossed = 0;
  let bent = 0;
  for (const [moves, posts] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]) {
    for (let seed = 1; seed <= seeds; seed++) {
      const r = stress(seed, seconds, moves, posts);
      if (posts && r.bent) bent++;
      worst = Math.max(worst, r.worstWait);
      if (r.plates) crossed++;
      if (r.worstWait >= 4 * TICK_HZ || r.stalledWindows || r.locked) {
        bad++;
        console.log(`FAIL seed ${seed} moves ${moves} posts ${posts}: ${JSON.stringify(r)}`);
      }
    }
  }
  console.log(
    `${seeds} seeds × {no moves, moves} × {straight, random posts}, ${seconds} s each: ${crossed} runs had plates, ${bent} had bent belts, ${bad} failures; worst wait ${(worst / TICK_HZ).toFixed(2)} s`
  );
}
