/**
 * Greedy scripted player for Rockhopper. It measures pacing beats from a fresh save using only
 * the real simulation and legal commands. Scripted input is faster than a human: treat the
 * output as an upper bound on pace, not as a playtest.
 *
 *   npm run bot:rockhopper [-- --minutes 20 --no-laser]
 */
import { SLOTS, TICK_HZ } from '../src/rockhopper/config';
import {
  beltEnds,
  buildDrill,
  buildSmelter,
  canSplice,
  canTarget,
  cellPos,
  clearLaser,
  drills,
  freeSockets,
  freshState,
  hubCost,
  inputsOf,
  machinePos,
  priceOf,
  route,
  setLaser,
  slotVisible,
  smelterSpotOk,
  smelters,
  step,
  unlock,
  unlockCost,
  upgrade,
  upgradeCost,
  upgradeHub,
  widen,
  widenPrice,
  type Machine,
  type State,
  type Target,
} from '../src/rockhopper/sim';

export interface Beat {
  label: string;
  seconds: number;
}

export interface BotOptions {
  minutes: number;
  laser: boolean;
  seed: number;
  log?: (line: string) => void;
}

/** A spot on a drill's dock-bound belt where a smelter can be spliced in, nearest the drill. */
function spliceSpot(s: State, owner: Machine): { x: number; y: number } | null {
  const e = beltEnds(s, owner);
  if (!e) return null;
  for (let f = 0.25; f <= 0.9; f += 0.05) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    if (smelterSpotOk(s, p) && canSplice(s, owner, null, p)) return p;
  }
  return null;
}

/** Link an unlinked machine: the nearest drill junction or smelter with room (never a loop). */
function linkUp(s: State, m: Machine): Target | null {
  const p = machinePos(m);
  let best: Target | null = null,
    bd = Infinity;
  for (const x of s.machines) {
    if (!x.out) continue;
    const t = { kind: x.kind, id: x.id } as Target;
    if (!canTarget(s, m, t)) continue;
    const q = machinePos(x);
    // Prefer machines whose belt is not already saturated, and smelters for raw drills.
    const d =
      Math.hypot(q.x - p.x, q.y - p.y) + (x.full ? 400 : 0) + (x.kind === 'smelter' ? -40 : 0);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best && route(s, m.id, best) === true ? best : null;
}

export function runBot(opts: BotOptions): {
  state: State;
  beats: Beat[];
  income: [number, number][];
} {
  const s = freshState(opts.seed);
  const beats: Beat[] = [];
  const mark = (label: string) => {
    if (!beats.some((b) => b.label === label)) beats.push({ label, seconds: s.tick / TICK_HZ });
  };
  const income: [number, number][] = [];
  let lastEarned = 0;
  const ticks = opts.minutes * 60 * TICK_HZ;
  while (s.tick < ticks) {
    // Manual laser on the unlocked rock with most cells left (bot thumbs never tire).
    if (opts.laser) {
      let best = -1;
      s.slots.forEach((slot, i) => {
        if (
          slot.rock &&
          !slot.crumble &&
          (best < 0 || slot.rock.remaining > s.slots[best].rock!.remaining)
        )
          best = i;
      });
      if (best >= 0) {
        const rock = s.slots[best].rock!;
        const k = rock.cells.findIndex((c) => c > 0);
        setLaser(s, best, cellPos(best, rock, k));
      } else clearLaser(s);
    }
    if (s.tick % 10 === 0) act(s, mark);
    step(s);
    s.events.length = 0;
    if (s.tick % (30 * TICK_HZ) === 0) {
      income.push([s.tick / TICK_HZ / 60, (s.earned - lastEarned) / 30]);
      lastEarned = s.earned;
    }
  }
  return { state: s, beats, income };
}

/** Raw chains: drills feeding drill junctions (the logistics the smelters must not replace). */
export const rawChains = (s: State) => drills(s).filter((d) => d.out?.to.kind === 'drill').length;

function act(s: State, mark: (l: string) => void) {
  // Free moves first: link anything unlinked.
  for (const m of s.machines) {
    if (m.out) continue;
    const t = linkUp(s, m);
    if (t?.kind === 'drill') mark('first chain');
  }
  const ds = drills(s);
  const sms = smelters(s);
  // Candidate purchases, each scored by estimated payoff per credit; buy the best affordable.
  type Option = { cost: number; score: number; label: string; run: () => unknown };
  const options: Option[] = [];
  for (let i = 0; i < SLOTS.length; i++) {
    if (!s.slots[i].unlocked) continue;
    const free = freeSockets(s, i);
    if (!free.length) continue;
    const cost = priceOf(s, 'drill');
    options.push({
      cost,
      score: (SLOTS[i].tier * 1.6) / cost,
      label: 'drill',
      run: () => buildDrill(s, i, free[0]),
    });
  }
  const unlinked = s.machines.filter((m) => !m.out).length;
  const saturated = s.machines.filter((m) => m.full && m.out);
  const jammed = sms.filter((m) => m.jam);
  // A smelter spliced into a busy dock line: compress it and triple its value.
  const lines = ds
    .filter((d) => d.out?.to.kind === 'dock')
    .sort((a, b) => inputsOf(s, b.id).length - inputsOf(s, a.id).length || b.level - a.level);
  // Only raw lines are worth compressing: skip lines that already run through a smelter.
  const raw = lines.filter(
    (d) =>
      !s.machines.some(
        (x) =>
          x.kind === 'smelter' &&
          x.out?.to.kind === 'dock' &&
          x.out.to.index === (d.out!.to as { index: number }).index
      )
  );
  const line = raw.find((d) => spliceSpot(s, d));
  if (line && ds.length >= 3) {
    const cost = priceOf(s, 'smelter');
    options.push({
      cost,
      score: (3.5 + unlinked) / cost,
      label: 'smelter',
      run: () => buildSmelter(s, spliceSpot(s, line)!, line.id),
    });
  }
  for (const m of saturated) {
    const c = widenPrice(s, m);
    if (c !== null)
      options.push({ cost: c, score: 2.2 / c, label: 'widen', run: () => widen(s, m.id) });
  }
  const dc = hubCost(s, 'docks');
  const docksFull = s.machines.filter((m) => m.out?.to.kind === 'dock').length >= s.docks;
  if (dc !== null && (unlinked > 0 || (docksFull && saturated.length > 0)))
    options.push({ cost: dc, score: 2.5 / dc, label: 'dock', run: () => upgradeHub(s, 'docks') });
  for (let i = 0; i < SLOTS.length; i++) {
    const c = unlockCost(s, i);
    if (c !== null && slotVisible(s, i) && ds.length >= 2)
      options.push({
        cost: c,
        score: (SLOTS[i].tier * 4) / c,
        label: `unlock T${SLOTS[i].tier}`,
        run: () => unlock(s, i),
      });
  }
  for (const m of s.machines) {
    const c = upgradeCost(m);
    if (c === null) continue;
    // Upgrading a belt-limited drill is a dead purchase; a jammed smelter is worth it.
    const w = m.kind === 'drill' ? (m.full ? 0.1 : 0.7) : m.jam ? 2 : 0.6;
    options.push({
      cost: c,
      score: w / c,
      label: `${m.kind} upgrade`,
      run: () => upgrade(s, m.id),
    });
  }
  void jammed;
  const tc = hubCost(s, 'tractor');
  if (tc !== null)
    options.push({
      cost: tc,
      score: 1 / tc,
      label: 'tractor',
      run: () => upgradeHub(s, 'tractor'),
    });
  const lc = hubCost(s, 'laser');
  if (lc !== null)
    options.push({ cost: lc, score: 0.8 / lc, label: 'laser', run: () => upgradeHub(s, 'laser') });
  options.sort((a, b) => b.score - a.score);
  const pick = options[0];
  if (pick && s.credits >= pick.cost && pick.run() === true) {
    const n = (l: string) => s.machines.filter((m) => m.kind === l).length;
    if (pick.label === 'drill') mark(`drill #${n('drill')}`);
    else if (pick.label === 'smelter') mark(`smelter #${n('smelter')}`);
    else mark(pick.label);
  }
  if (s.slots.filter((x) => x.unlocked).length === 3) mark('T1 fully unlocked');
  if (s.slots.some((x, i) => x.unlocked && SLOTS[i].tier === 2)) mark('T2 reached');
  if (s.slots.some((x, i) => x.unlocked && SLOTS[i].tier === 3)) mark('T3 reached');
  if (s.slots.some((x, i) => x.unlocked && SLOTS[i].tier === 4)) mark('T4 reached');
}

if (process.argv[1]?.includes('rockhopper-bot')) {
  const arg = (k: string, d: number) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? Number(process.argv[i + 1]) : d;
  };
  const { state, beats, income } = runBot({
    minutes: arg('--minutes', 30),
    laser: !process.argv.includes('--no-laser'),
    seed: arg('--seed', 1),
  });
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  for (const b of beats) console.log(`${fmt(b.seconds).padStart(6)}  ${b.label}`);
  console.log(
    '\nincome (credits/s):',
    income
      .filter((_, i) => i % 2 === 1)
      .map(([m, v]) => `${m}m ${v.toFixed(1)}`)
      .join('  ')
  );
  console.log(
    `\nend: credits ${state.credits}, earned ${state.earned}, drills ${drills(state).length}, raw chains ${rawChains(state)}, smelters ${smelters(state).length}, docks ${state.docks}, tiers ${state.machines.map((m) => m.tier).join('')}, laser ${state.laserLevel}, stats`,
    state.stats
  );
}
