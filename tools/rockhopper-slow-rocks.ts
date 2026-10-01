/**
 * Slow-burn rocks evidence (docs/ROCKHOPPER_SLOW_ROCKS.md): the greedy bot over seeds and both
 * fields, today's rocks against slow-burn rocks. Bot numbers are an upper bound on pace, not a
 * playtest.
 *
 *   npx tsx tools/rockhopper-slow-rocks.ts [--seeds 1-8] [--minutes 40]
 */
import { SLOTS, TICK_HZ } from '../src/rockhopper/config';
import { drills, type State } from '../src/rockhopper/sim';
import { runBot } from './rockhopper-bot';

export interface SlowRun {
  seed: number;
  sector: boolean;
  slow: boolean;
  t2: number | null;
  t3: number | null;
  /** Longest stretch between T2 and T3 (or the run's end) with no purchase, a gap still open counted. */
  gap23: number;
  /** Share of ticks before T2 the first berth was empty, and drill-ticks with no rock. */
  emptyBeforeT2: number;
  idleBeforeT2: number;
  earned30: number;
  crumbleShare: number;
  maxFlight: number;
  rocksBeforeT2: number;
}

export function measure(seed: number, sector: boolean, slow: boolean, minutes: number): SlowRun {
  let t2: number | null = null,
    t3: number | null = null,
    last = 0,
    gap23 = 0,
    lastCredits = 0,
    empty = 0,
    pre = 0,
    idle = 0,
    drillT = 0,
    earned30 = 0,
    rocks = 0,
    crumbleChunks = 0,
    chunks = 0,
    maxFlight = 0;
  const seen = new Set<object>();
  const onTick = (s: State) => {
    const tier = (k: number) => s.slots.some((x, i) => x.unlocked && SLOTS[i].tier === k);
    if (t2 === null && tier(2)) t2 = last = s.tick;
    if (t3 === null && tier(3)) {
      t3 = s.tick;
      gap23 = Math.max(gap23, s.tick - last);
    }
    if (t2 === null) {
      pre++;
      if (!s.slots[0].rock) empty++;
      for (const d of drills(s)) {
        drillT++;
        const sl = s.slots[d.slot];
        if (!sl.rock || sl.crumble) idle++;
      }
      for (const e of s.events) if (e.type === 'arrive') rocks++;
    }
    if (s.credits < lastCredits - 0.5 && t2 !== null && t3 === null) {
      gap23 = Math.max(gap23, s.tick - last);
      last = s.tick;
    }
    lastCredits = s.credits;
    for (const e of s.events) if (e.type === 'break') chunks += e.chunks ?? 1;
    for (const f of s.flights)
      if (!seen.has(f)) {
        seen.add(f);
        maxFlight = Math.max(maxFlight, f.value);
      }
    for (const e of s.events)
      if (e.type === 'break' && e.by === 'crumble') crumbleChunks += e.chunks ?? 1;
    if (s.tick === 30 * 60 * TICK_HZ) earned30 = s.earned;
  };
  const { state } = runBot({ minutes, laser: true, seed, sector, slowRocks: slow, onTick });
  if (t2 !== null && t3 === null) gap23 = Math.max(gap23, state.tick - last);
  return {
    seed,
    sector,
    slow,
    t2: t2 === null ? null : t2 / TICK_HZ,
    t3: t3 === null ? null : t3 / TICK_HZ,
    gap23: gap23 / TICK_HZ,
    emptyBeforeT2: empty / Math.max(1, pre),
    idleBeforeT2: idle / Math.max(1, drillT),
    earned30,
    crumbleShare: crumbleChunks / Math.max(1, chunks),
    maxFlight,
    rocksBeforeT2: rocks,
  };
}

if (process.argv[1]?.includes('rockhopper-slow-rocks')) {
  const arg = (k: string, d: string) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : d;
  };
  const [a, b] = arg('--seeds', '1-8').split('-').map(Number);
  const minutes = Number(arg('--minutes', '40'));
  const fmt = (t: number | null) =>
    t === null ? '  -  ' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  console.log(
    'field   seed  mode    T2     T3     gapT2-T3  ratio  empty<T2 idle<T2  earned30  crumble  maxFlight'
  );
  for (const sector of [false, true])
    for (let seed = a; seed <= (b || a); seed++) {
      const today = measure(seed, sector, false, minutes);
      const slow = measure(seed, sector, true, minutes);
      for (const r of [today, slow])
        console.log(
          `${sector ? 'sector ' : 'classic'} ${String(seed).padStart(4)}  ${r.slow ? 'slow ' : 'today'}  ${fmt(r.t2)}  ${fmt(r.t3)}  ${fmt(r.gap23).padStart(8)}  ${r.slow ? (slow.gap23 / today.gap23).toFixed(2) + '×' : '     '}  ${(100 * r.emptyBeforeT2).toFixed(0).padStart(6)}%  ${(100 * r.idleBeforeT2).toFixed(0).padStart(5)}%  ${Math.round(r.earned30 / 1000)}k`.padEnd(
            100
          ) + `${(100 * r.crumbleShare).toFixed(1)}%  ${r.maxFlight}`
        );
    }
}
