/**
 * Greedy scripted player for Rockhopper. It measures pacing beats from a fresh save using only
 * the real simulation and legal commands. Scripted input is faster than a human: treat the
 * output as an upper bound on pace, not as a playtest.
 *
 *   npm run bot:rockhopper [-- --minutes 20 --no-laser]
 */
import { SLOTS, TICK_HZ } from '../src/rockhopper/config';
import {
  buildDrill,
  buildSmelter,
  cellPos,
  clearLaser,
  drills,
  freeSockets,
  freshState,
  hubCost,
  priceOf,
  route,
  setLaser,
  slotVisible,
  smelterInputsOf,
  smelterSpotOk,
  smelters,
  step,
  unlock,
  unlockCost,
  upgrade,
  upgradeCost,
  upgradeHub,
  type State,
} from '../src/rockhopper/sim';

export interface Beat {
  label: string;
  seconds: number;
}

export interface BotOptions {
  minutes: number;
  laser: boolean;
  seed: number;
  /** Stop after this many drills (for clip witnesses). */
  log?: (line: string) => void;
}

/** Open space about a third of the way from the newest drills' rock to the hub. */
function smelterSpot(s: State): { x: number; y: number } | null {
  const ds = drills(s);
  const d = ds.find((x) => !x.out) ?? ds[ds.length - 1];
  const aim = d ? { x: SLOTS[d.slot].x * 0.6, y: SLOTS[d.slot].y * 0.62 } : { x: 0, y: -110 };
  const tries: { x: number; y: number }[] = [];
  for (let y = -60; y >= -1000; y -= 15) for (let x = -300; x <= 300; x += 15) tries.push({ x, y });
  tries.sort((a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y));
  return tries.find((p) => smelterSpotOk(s, p)) ?? null;
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

function act(s: State, mark: (l: string) => void) {
  const ds = drills(s);
  const sms = smelters(s);
  // Candidate purchases, each scored by estimated payoff per credit; buy the best affordable.
  type Option = { cost: number; score: number; label: string; run: () => void };
  const options: Option[] = [];
  // Drill into a free socket, preferring richer tiers.
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
  if (unlinked > 0 || (sms.length === 0 && ds.length >= 3)) {
    const spot = smelterSpot(s);
    const cost = priceOf(s, 'smelter');
    if (spot)
      options.push({
        cost,
        score: (3 + unlinked) / cost,
        label: 'smelter',
        run: () => buildSmelter(s, spot),
      });
  }
  const dc = hubCost(s, 'docks');
  if (dc !== null && unlinked > 0)
    options.push({ cost: dc, score: 2.5 / dc, label: 'dock', run: () => upgradeHub(s, 'docks') });
  for (let i = 0; i < SLOTS.length; i++) {
    const c = unlockCost(s, i);
    if (c !== null && slotVisible(s, i) && ds.filter((d) => d.slot !== undefined).length >= 2)
      options.push({
        cost: c,
        score: (SLOTS[i].tier * 4) / c,
        label: `unlock T${SLOTS[i].tier}`,
        run: () => unlock(s, i),
      });
  }
  for (const m of s.machines) {
    const c = upgradeCost(m);
    if (c !== null)
      options.push({
        cost: c,
        score: (m.kind === 'drill' ? 0.7 : 0.9) / c,
        label: `${m.kind} upgrade`,
        run: () => upgrade(s, m.id),
      });
  }
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
  if (pick && s.credits >= pick.cost) {
    pick.run();
    const n = (l: string) => s.machines.filter((m) => m.kind === l).length;
    if (pick.label === 'drill') mark(`drill #${n('drill')}`);
    else if (pick.label === 'smelter') mark(`smelter #${n('smelter')}`);
    else mark(pick.label);
    // Route direct-to-dock drills into smelters with spare inputs, freeing docks.
    for (const sm of smelters(s)) {
      for (const d of drills(s)) {
        if (smelterInputsOf(s, sm.id).length >= 3) break;
        if (d.out?.to.kind === 'dock' && drills(s).some((x) => !x.out))
          route(s, d.id, { kind: 'smelter', id: sm.id });
      }
    }
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
    `\nend: credits ${state.credits}, earned ${state.earned}, drills ${drills(state).length}, smelters ${smelters(state).length}, docks ${state.docks}, laser ${state.laserLevel}, stats`,
    state.stats
  );
}
