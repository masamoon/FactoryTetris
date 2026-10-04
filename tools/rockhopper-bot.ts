/**
 * Greedy scripted player for Rockhopper. It measures pacing beats from a fresh save using only
 * the real simulation and legal commands. Scripted input is faster than a human: treat the
 * output as an upper bound on pace, not as a playtest.
 *
 *   npm run bot:rockhopper [-- --minutes 20 --no-laser --sector --slow --rising]
 */
import { BAR_VALUE, COPPER, CRYSTAL, PICK_REACH, SLOTS, TICK_HZ } from '../src/rockhopper/config';
import {
  beltEnds,
  buildDrill,
  buildFactory,
  byId,
  factories,
  factoryUnlocked,
  setFactories,
  tiersBought,
  buildSmelter,
  canSplice,
  canTarget,
  cellPos,
  clearLaser,
  drills,
  drillSpotWhy,
  LEGACY_SOCKETS,
  legacySocketAngle,
  freshState,
  hubCost,
  inputsOf,
  machinePos,
  priceOf,
  drillPriceOn,
  route,
  setLaser,
  setPick,
  setOrePicks,
  setPickReach,
  slotVisible,
  smelterSpotOk,
  targetWhy,
  smelters,
  step,
  unlock,
  unlockCost,
  upgrade,
  upgradeCost,
  upgradeHub,
  widen,
  widenPrice,
  type Drill,
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
  /** Play the seed's generated sector instead of the classic field. */
  sector?: boolean;
  /** Slow-burn rocks (deep rocks, auto-tow, own slot prices). */
  slowRocks?: boolean;
  /** Rising prices (drills by rock, the rest geometric) instead of fixed costs. */
  rising?: boolean;
  /** The crossings experiment (plates and clear lanes); on unless set false. */
  crossings?: boolean;
  /** A careless player: every 10 s one dock-bound machine is re-routed to a random free dock. */
  messy?: boolean;
  /**
   * The factories experiment: switch on, and teach the bot the long copper route (every copper
   * smelter's belt goes to a crystal factory when one has a free input).
   */
  factories?: boolean;
  /**
   * The ore picks experiment (with factories): every T3/T4 drill picks crystal, and T1 drills
   * feeding a crystal factory pick copper.
   */
  picks?: boolean;
  /** With picks: the reach cap in rock radii (default `PICK_REACH`). */
  pickReach?: number;
  log?: (line: string) => void;
  /** Called after every tick, before the tick's events are cleared (measurement tools). */
  onTick?: (s: State) => void;
}

/** A spot on a drill's dock-bound belt where a smelter can be spliced in, nearest the drill. */
function spliceSpot(s: State, owner: Machine): { x: number; y: number } | null {
  const e = beltEnds(s, owner);
  if (!e) return null;
  for (let f = 0.25; f <= 0.9; f += 0.05) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    if (smelterSpotOk(s, p, undefined, owner.id) && canSplice(s, owner, null, p)) return p;
  }
  return null;
}

/** The factories experiment's measurements (docs/ROCKHOPPER_SORTER.md, C6). */
export const factoryStats = {
  /** Factory-ticks, ticks with a job, and ticks with the output belt flagged full. */
  ticks: 0,
  busy: 0,
  full: 0,
  /** Paired copper bars delivered as bars, inside copper + crystal alloys, inside other alloys. */
  cuBars: 0,
  cuCr: 0,
  cuOther: 0,
  alloys: 0,
  /** Factories placed: on a crystal line, elsewhere (local); copper belts routed to crystal. */
  crystal: 0,
  local: 0,
  copperRoutes: 0,
  copperRouteRefused: 0,
};

/** The ores a machine's line carries, from the tiers of the drills that feed it (recursively). */
function lineTiers(s: State, m: Machine, seen = new Set<number>()): Set<number> {
  const out = new Set<number>();
  if (seen.has(m.id)) return out;
  seen.add(m.id);
  if (m.kind === 'drill') out.add(SLOTS[m.slot].tier);
  for (const x of inputsOf(s, m.id)) for (const k of lineTiers(s, x, seen)) out.add(k);
  return out;
}
/** The ore picks experiment is on for this run (`BotOptions.picks`). */
let picksOn = false;

/** Every drill whose chunks reach `m`. */
function upstreamDrills(s: State, m: Machine, seen = new Set<number>()): Drill[] {
  if (seen.has(m.id)) return [];
  seen.add(m.id);
  const out: Drill[] = m.kind === 'drill' ? [m] : [];
  for (const x of inputsOf(s, m.id)) out.push(...upstreamDrills(s, x, seen));
  return out;
}
const carriesCrystal = (s: State, m: Machine) => {
  const t = lineTiers(s, m);
  return t.has(3) || t.has(4);
};
/** A copper line: fed only by T1 drills, so its bars are copper and ice (no gold to steal crystal). */
const carriesCopperOnly = (s: State, m: Machine) => {
  const t = lineTiers(s, m);
  return t.size === 1 && t.has(1);
};

/** A spot on a smelter's belt where a factory can be spliced in. */
function spliceSpotFor(s: State, owner: Machine): { x: number; y: number } | null {
  const e = beltEnds(s, owner);
  if (!e) return null;
  for (let f = 0.3; f <= 0.9; f += 0.05) {
    const p = { x: e.a.x + (e.b.x - e.a.x) * f, y: e.a.y + (e.b.y - e.a.y) * f };
    if (smelterSpotOk(s, p, undefined, owner.id) && canSplice(s, owner, null, p, false, 'factory'))
      return p;
  }
  return null;
}

/** How often the lane rule (C8) said no: socket spots and link targets tried, and refused. */
export const refusals = { spots: 0, onBelt: 0, spotBlocked: 0, links: 0, linkBlocked: 0 };

/** Link an unlinked machine: the nearest drill junction or smelter with room (never a loop). */
function linkUp(s: State, m: Machine): Target | null {
  const p = machinePos(m);
  let best: Target | null = null,
    bd = Infinity;
  for (const x of s.machines) {
    if (!x.out) continue;
    const t = { kind: x.kind, id: x.id } as Target;
    const why = targetWhy(s, m, t);
    if (why !== 'invalid') refusals.links++;
    if (why === 'belt blocked') refusals.linkBlocked++;
    if (why) continue;
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
  const s = freshState(opts.seed, opts.sector ?? false, opts.slowRocks ?? false);
  s.crossings = opts.crossings ?? true;
  if (opts.rising) s.fixedCosts = false;
  if (opts.factories) setFactories(s, true);
  picksOn = !!opts.picks;
  if (picksOn) setOrePicks(s, true);
  setPickReach(opts.pickReach ?? PICK_REACH);
  for (const k of Object.keys(refusals) as (keyof typeof refusals)[]) refusals[k] = 0;
  buyTicks.length = 0;
  waitLog.length = 0;
  for (const k of Object.keys(factoryStats) as (keyof typeof factoryStats)[]) factoryStats[k] = 0;
  let mess = opts.seed * 7919 + 1;
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
    if (opts.messy && s.tick % (10 * TICK_HZ) === 0) {
      mess = (mess * 16807) % 2147483647;
      const ms = s.machines.filter((m) => m.out?.to.kind === 'dock');
      const m = ms[mess % Math.max(1, ms.length)];
      if (m) {
        const free = [...Array(s.docks).keys()].filter((k) =>
          canTarget(s, m, { kind: 'dock', index: k })
        );
        if (free.length) route(s, m.id, { kind: 'dock', index: free[mess % free.length] });
      }
    }
    step(s);
    opts.onTick?.(s);
    for (const e of s.events) {
      if (e.type !== 'deliver' || e.ore !== COPPER) continue;
      if (e.alloy === CRYSTAL) factoryStats.cuCr++;
      else if (e.alloy !== undefined) factoryStats.cuOther++;
      else if (e.value === BAR_VALUE * 3) factoryStats.cuBars++;
    }
    for (const e of s.events)
      if (e.type === 'deliver' && e.alloy !== undefined) factoryStats.alloys++;
    for (const f of factories(s)) {
      factoryStats.ticks++;
      if (f.job) factoryStats.busy++;
      if (f.full) factoryStats.full++;
    }
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

/**
 * A legal rim angle on slot `i`. The bot keeps the old socket spots and counts: crowding a rock
 * past them only drains it faster into the respawn wait, which this greedy bot can't weigh.
 */
function freeRim(s: State, i: number): number | null {
  if (process.env.BOT_FULL_RIM) {
    for (let a = 0; a < Math.PI * 2; a += 0.04) if (!drillSpotWhy(s, i, a)) return a;
    return null;
  }
  // Near each old socket: a belt may run over the exact spot, so try a little to either side.
  const tries = [...Array(LEGACY_SOCKETS[i]).keys()].flatMap((k) =>
    [0, 0.12, -0.12, 0.24, -0.24].map((d) => legacySocketAngle(i, k) + d)
  );
  for (let k = 0; k < LEGACY_SOCKETS[i]; k++) {
    const why = drillSpotWhy(s, i, legacySocketAngle(i, k));
    if (why === 'no room here' || why === 'locked') continue;
    refusals.spots++;
    if (why === 'on a belt') refusals.onBelt++;
    if (why === 'belt blocked') refusals.spotBlocked++;
  }
  return tries.find((a) => !drillSpotWhy(s, i, a)) ?? null;
}

/** Ticks at which the bot bought something, and what its best option was each time it looked. */
export const buyTicks: number[] = [];
export const waitLog: [number, string, boolean][] = [];

/**
 * Dead time: stretches with no purchase. A gap over 30 s counts as dead; `savingFor` is what the
 * bot's best option was while it couldn't afford it, by share of those looks.
 */
export function deadTime(endTick: number) {
  const t = [0, ...buyTicks, endTick].map((x) => x / TICK_HZ);
  let longest = 0,
    dead = 0;
  for (let i = 1; i < t.length; i++) {
    const gap = t[i] - t[i - 1];
    longest = Math.max(longest, gap);
    if (gap > 30) dead += gap;
  }
  const waits = waitLog.filter(([, , can]) => !can);
  const by = new Map<string, number>();
  for (const [, label] of waits) by.set(label, (by.get(label) ?? 0) + 1);
  const savingFor = [...by]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([l, n]) => `${l} ${Math.round((100 * n) / Math.max(1, waits.length))}%`)
    .join(', ');
  const total = endTick / TICK_HZ;
  return {
    buys: buyTicks.length,
    longest,
    dead,
    share: Math.round((100 * dead) / total),
    savingFor,
  };
}

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
    const free = freeRim(s, i);
    if (free === null) continue;
    const cost = drillPriceOn(s, i);
    options.push({
      cost,
      score: (SLOTS[i].tier * 1.6) / cost,
      label: 'drill',
      run: () => buildDrill(s, i, free),
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
  // Widen only a belt that stays saturated (a drill briefly outrunning its belt in soft rock
  // doesn't count), scaled by how much is waiting behind it.
  for (const m of saturated) {
    const c = widenPrice(s, m);
    if (c === null || m.fullT < 0.85) continue;
    const behind = 1 + inputsOf(s, m.id).length;
    options.push({ cost: c, score: (0.9 * behind) / c, label: 'widen', run: () => widen(s, m.id) });
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
    const w = m.kind === 'drill' ? (m.full ? 0.1 : 0.7) : m.kind === 'smelter' && m.jam ? 2 : 0.6;
    options.push({
      cost: c,
      score: w / c,
      label: `${m.kind} upgrade`,
      run: () => upgrade(s, m.id),
    });
  }
  void jammed;
  if (picksOn) {
    // Every T3/T4 drill digs crystal first; T1 drills feeding a crystal factory dig copper first.
    const cu = new Set<number>();
    for (const f of factories(s))
      if (carriesCrystal(s, f)) for (const d of upstreamDrills(s, f)) cu.add(d.id);
    for (const d of drills(s)) {
      const tier = SLOTS[d.slot].tier;
      const want = tier >= 3 ? CRYSTAL : tier === 1 && cu.has(d.id) ? COPPER : undefined;
      if (d.pick !== want && setPick(s, d.id, want ?? null) === true) mark('ore picks');
    }
  }
  if (factoryUnlocked(s)) {
    // Free move: a copper smelter's belt goes to a crystal factory with a free input.
    for (const f of factories(s)) {
      if (!carriesCrystal(s, f)) continue;
      const cu = sms.find(
        (m) =>
          m.out?.to.kind === 'dock' && carriesCopperOnly(s, m) && !inputsOf(s, m.id).includes(f)
      );
      if (!cu) continue;
      const r = route(s, cu.id, { kind: 'factory', id: f.id });
      if (r === true) {
        factoryStats.copperRoutes++;
        mark('copper to crystal');
      } else factoryStats.copperRouteRefused++;
    }
    // A factory spliced after a smelter: on a crystal line it is the copper sink; elsewhere a
    // local factory at 1.25x.
    const hosts = sms.filter(
      (m) => m.out && (m.out.to.kind === 'dock' || m.out.to.kind === 'drill') && spliceSpotFor(s, m)
    );
    const crystalHost = hosts.find((m) => carriesCrystal(s, m));
    const host =
      crystalHost && !factories(s).some((f) => carriesCrystal(s, f)) ? crystalHost : hosts[0];
    if (host) {
      const cost = priceOf(s, 'factory');
      const crystal = carriesCrystal(s, host);
      options.push({
        cost,
        score: (crystal ? 6 : 1.2) / cost,
        label: crystal ? 'crystal factory' : 'local factory',
        run: () => {
          const r = buildFactory(s, spliceSpotFor(s, host)!, host.id);
          if (r === true) factoryStats[crystal ? 'crystal' : 'local']++;
          return r;
        },
      });
    }
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
  if (pick) waitLog.push([s.tick, pick.label.replace(/ #\d+$/, ''), s.credits >= pick.cost]);
  if (pick && s.credits >= pick.cost && pick.run() === true) {
    buyTicks.push(s.tick);
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
    crossings: !process.argv.includes('--no-crossings'),
    factories: process.argv.includes('--factories') || process.argv.includes('--picks'),
    picks: process.argv.includes('--picks'),
    pickReach: arg('--reach', PICK_REACH),
    sector: process.argv.includes('--sector'),
    slowRocks: process.argv.includes('--slow'),
    rising: process.argv.includes('--rising'),
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
  if (factories(state).length || process.argv.includes('--factories')) {
    const f = factoryStats;
    const cu = f.cuBars + f.cuCr + f.cuOther;
    console.log(
      `factories: ${factories(state).length} (crystal ${f.crystal}, local ${f.local}), levels ${factories(
        state
      )
        .map((x) => x.level)
        .join(
          ''
        )}, busy ${((100 * f.busy) / Math.max(1, f.ticks)).toFixed(0)}%, output full ${((100 * f.full) / Math.max(1, f.ticks)).toFixed(0)}%, copper routes ${f.copperRoutes} (refused ${f.copperRouteRefused}), alloys delivered ${f.alloys}`
    );
    console.log(
      `paired copper bars reaching a crystal factory: ${((100 * f.cuCr) / Math.max(1, cu)).toFixed(0)}% (${f.cuCr} of ${cu}; ${f.cuOther} in other alloys)`
    );
  }
  console.log(`tiersBought ${tiersBought(state)}`);
  const g = deadTime(state.tick);
  console.log(
    `dead time: ${g.buys} buys, longest gap ${fmt(g.longest)}, ${fmt(g.dead)} in gaps over 30 s (${g.share}%), saving for: ${g.savingFor}`
  );
  void byId;
}
