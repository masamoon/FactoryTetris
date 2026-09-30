import {
  arrivalSeconds,
  BAR_VALUE,
  BELT_SPACING,
  BELT_SPEED,
  BELT_TIER_MAX,
  CELL,
  CRUMBLE_AT,
  CRUMBLE_SECONDS,
  dockCost,
  DOCK_ANGLES,
  DOCK_RADIUS,
  DOCKS_MAX,
  DOCKS_START,
  DRILL_BUFFER,
  DRILL_INPUTS,
  DRILL_MAX_LEVEL,
  DRILL_RADIUS,
  drillPrice,
  drillRate,
  drillUpgradeCost,
  DT,
  FLIGHT_MAX,
  FLIGHT_MIN,
  FLIGHT_SPEED,
  LASER_COST,
  LASER_POWER,
  LONE_BAR_VALUE,
  type Ore,
  ORES,
  SELL_REFUND,
  SLOTS,
  SMELTER_MAX_LEVEL,
  SMELTER_QUEUE,
  SMELTER_RADIUS,
  SMELTER_READY,
  smelterInputs,
  smelterPrice,
  smelterTime,
  smelterUpgradeCost,
  SOCKET_GAP,
  TICK_HZ,
  TIER_ORE,
  TOW_SECONDS,
  TRACTOR_MAX,
  tractorCost,
  widenCost,
} from './config';

export interface Point {
  x: number;
  y: number;
}

export interface Rock {
  r: number;
  /** Grid width and height: 2r + 3. */
  w: number;
  /** Ore per grid cell, 0 = empty. */
  cells: number[];
  /** Work already applied to each cell. */
  work: number[];
  total: number;
  remaining: number;
}

export interface Slot {
  unlocked: boolean;
  /** Rocks generated so far in this slot. */
  gen: number;
  rock: Rock | null;
  /** Tick at which the next rock is in place (while `rock` is null). */
  arriveAt: number;
  /** Cells broken per tick while crumbling, or 0. */
  crumble: number;
}

/** A belt ends at a hub dock or at another machine (a smelter, or a drill acting as a junction). */
export type Target =
  | { kind: 'dock'; index: number }
  | { kind: 'smelter'; id: number }
  | { kind: 'drill'; id: number };

/**
 * One bundle on a belt: up to the belt's tier of real chunks or bars travelling together.
 * `mult` is the value of each item in chunks of its ore: 1 raw, 6 a bar (two chunks), 3 a
 * lone-chunk bar or a bar from a pre-logistics save. Bundles never mix values.
 */
export interface BeltItem {
  pos: number;
  ores: Ore[];
  mult: number;
}

export interface Belt {
  to: Target;
  length: number;
  /** Front (largest pos) first. */
  items: BeltItem[];
}

/** A finished (or passing) bar waiting at a smelter for its output belt. */
export interface Bar {
  ore: Ore;
  mult: number;
}

interface MachineBase {
  id: number;
  level: number;
  /** Credits paid for the machine, its upgrades and the belt tiers bought on it. */
  spent: number;
  out: Belt | null;
  /** Output belt tier (1–4): the most items one bundle can hold. It stays with the machine. */
  tier: number;
  /** Tier steps bought with credits (migrated tiers are not bought and never raise prices). */
  tierBought: number;
  /** Zipper pointer: the next source to load from (own stock first, then inputs by id). */
  rr: number;
  /** Seconds of sustained "can't load fast enough" (0–1.5) and its hysteresis flag. */
  fullT: number;
  full: boolean;
}

export interface Drill extends MachineBase {
  kind: 'drill';
  slot: number;
  socket: number;
  buffer: Ore[];
  cell: number;
  /** Transient: this tick the drill had to stop because its buffer was full. */
  stalled?: boolean;
}

export interface Smelter extends MachineBase {
  kind: 'smelter';
  x: number;
  y: number;
  queue: Ore[];
  job: { ore: Ore; left: number; pair: boolean } | null;
  ready: Bar[];
  /** Ticks since the last intake: a lone chunk left without a pair is smelted alone. */
  idle: number;
  /** Seconds of sustained "inputs waiting because the queue is full" and its flag. */
  jamT: number;
  jam: boolean;
}

export type Machine = Drill | Smelter;

export interface Flight {
  ore: Ore;
  value: number;
  x: number;
  y: number;
  t0: number;
  t1: number;
}

export interface Laser {
  slot: number;
  x: number;
  y: number;
  cell: number;
}

export type SimEvent =
  | {
      type: 'break';
      slot: number;
      cell: number;
      ore: Ore;
      x: number;
      y: number;
      by: 'laser' | 'drill' | 'crumble';
    }
  | { type: 'deliver'; x: number; y: number; value: number; ore: Ore; bar: boolean; dock: number }
  | { type: 'smelt'; id: number; ore: Ore }
  | { type: 'crumble'; slot: number }
  | { type: 'arrive'; slot: number }
  | { type: 'build'; id: number }
  | { type: 'move'; id: number }
  | { type: 'sell'; id: number; x: number; y: number; lost: number }
  | { type: 'upgrade'; id: number }
  | { type: 'widen'; id: number }
  | { type: 'hub'; what: HubUpgrade }
  | { type: 'unlock'; slot: number }
  | { type: 'route'; id: number };

export type HubUpgrade = 'laser' | 'docks' | 'tractor';

export interface Stats {
  laserBroken: number;
  drillBroken: number;
  crumbleBroken: number;
  delivered: number;
  bars: number;
}

export interface State {
  version: 2;
  seed: number;
  tick: number;
  credits: number;
  earned: number;
  slots: Slot[];
  machines: Machine[];
  nextId: number;
  docks: number;
  laserLevel: number;
  tractorLevel: number;
  flights: Flight[];
  laser: Laser | null;
  stats: Stats;
  /** Transient: events from the latest ticks, drained by the presenter. */
  events: SimEvent[];
}

// ---------------------------------------------------------------- noise

export function hash(x: number, y: number, s: number): number {
  let h =
    (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, s: number, sc: number): number {
  const gx = Math.floor(x / sc),
    gy = Math.floor(y / sc);
  const fx = x / sc - gx,
    fy = y / sc - gy;
  const a = hash(gx, gy, s),
    b = hash(gx + 1, gy, s),
    c = hash(gx, gy + 1, s),
    d = hash(gx + 1, gy + 1, s);
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ---------------------------------------------------------------- rocks

export function generateRock(slotIndex: number, gen: number, worldSeed: number): Rock {
  const def = SLOTS[slotIndex];
  const r = def.r;
  const w = 2 * r + 3;
  const seed = Math.floor(hash(slotIndex * 977 + gen * 31, worldSeed, 13) * 1e9);
  const cells = new Array<number>(w * w).fill(0);
  const inside: { i: number; n: number; t: number }[] = [];
  for (let j = 0; j < w; j++) {
    for (let i = 0; i < w; i++) {
      const x = i - (r + 1),
        y = j - (r + 1);
      const ang = Math.atan2(y, x);
      const edge =
        r * (0.84 + 0.2 * vnoise(Math.cos(ang) * 2.2 + 9, Math.sin(ang) * 2.2 + 9, seed, 1));
      if (Math.hypot(x, y) > edge) continue;
      inside.push({
        i: j * w + i,
        n: vnoise(x + 40, y + 40, seed + 5, 2.6),
        t: vnoise(x + 70, y + 70, seed + 17, 3.4),
      });
    }
  }
  const tier = TIER_ORE[def.tier];
  const ores = [...tier.ores, def.signature, def.signature];
  const oreCount = Math.round(inside.length * tier.share);
  const byRichness = [...inside].sort((a, b) => b.n - a.n || a.i - b.i);
  const oreCells = new Set(byRichness.slice(0, oreCount).map((c) => c.i));
  for (const c of inside) {
    cells[c.i] = oreCells.has(c.i)
      ? ores[Math.min(ores.length - 1, Math.floor(c.t * ores.length))]
      : 1;
  }
  return {
    r,
    w,
    cells,
    work: new Array<number>(w * w).fill(0),
    total: inside.length,
    remaining: inside.length,
  };
}

export function cellPos(slotIndex: number, rock: Rock, index: number): Point {
  const def = SLOTS[slotIndex];
  const i = index % rock.w,
    j = Math.floor(index / rock.w);
  return { x: def.x + (i - (rock.r + 1)) * CELL, y: def.y + (j - (rock.r + 1)) * CELL };
}

function nearestCell(slotIndex: number, rock: Rock, p: Point): number {
  const def = SLOTS[slotIndex];
  const lx = (p.x - def.x) / CELL + rock.r + 1,
    ly = (p.y - def.y) / CELL + rock.r + 1;
  let best = -1,
    bestD = Infinity;
  for (let k = 0; k < rock.cells.length; k++) {
    if (!rock.cells[k]) continue;
    const dx = (k % rock.w) - lx,
      dy = Math.floor(k / rock.w) - ly;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

// ---------------------------------------------------------------- geometry

export function socketAngle(slotIndex: number, socket: number): number {
  return ((90 + (360 / SLOTS[slotIndex].sockets) * socket) * Math.PI) / 180;
}

export function socketPos(slotIndex: number, socket: number): Point {
  const def = SLOTS[slotIndex];
  const a = socketAngle(slotIndex, socket);
  const d = def.r * CELL + SOCKET_GAP;
  return { x: def.x + Math.cos(a) * d, y: def.y + Math.sin(a) * d };
}

export function dockPos(index: number): Point {
  const a = (DOCK_ANGLES[index] * Math.PI) / 180;
  return { x: Math.cos(a) * DOCK_RADIUS, y: Math.sin(a) * DOCK_RADIUS };
}

export function machinePos(m: Machine): Point {
  return m.kind === 'drill' ? socketPos(m.slot, m.socket) : { x: m.x, y: m.y };
}

export function targetPos(s: State, t: Target): Point | null {
  if (t.kind === 'dock') return dockPos(t.index);
  const m = byId(s, t.id);
  return m ? machinePos(m) : null;
}

/** Belt start and end, trimmed to the machine bodies. */
export function beltEnds(s: State, m: Machine): { a: Point; b: Point } | null {
  if (!m.out) return null;
  const p = machinePos(m),
    q = targetPos(s, m.out.to);
  if (!q) return null;
  const dx = q.x - p.x,
    dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  const start = m.kind === 'drill' ? DRILL_RADIUS * 0.6 : SMELTER_RADIUS * 0.8;
  const t = m.out.to.kind;
  const end = t === 'dock' ? 0 : t === 'smelter' ? SMELTER_RADIUS * 0.8 : DRILL_RADIUS * 0.75;
  return {
    a: { x: p.x + ux * start, y: p.y + uy * start },
    b: { x: q.x - ux * end, y: q.y - uy * end },
  };
}

function beltLength(s: State, m: Machine): number {
  const e = beltEnds(s, m);
  return e ? Math.max(1, Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y)) : 1;
}

/** Distance from a point to a machine's belt, the nearest point on it and its fraction (0–1). */
export function beltDistance(s: State, m: Machine, p: Point) {
  const e = beltEnds(s, m);
  if (!e) return null;
  const dx = e.b.x - e.a.x,
    dy = e.b.y - e.a.y;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - e.a.x) * dx + (p.y - e.a.y) * dy) / L2));
  const q = { x: e.a.x + dx * t, y: e.a.y + dy * t };
  return { d: Math.hypot(p.x - q.x, p.y - q.y), t, q };
}

/** Belts passing within `tol` of a point, nearest first. */
export function beltsNear(s: State, p: Point, tol: number) {
  const out: { id: number; d: number; t: number; q: Point }[] = [];
  for (const m of s.machines) {
    const b = beltDistance(s, m, p);
    if (b && b.d <= tol) out.push({ id: m.id, ...b });
  }
  return out.sort((a, b) => a.d - b.d || a.id - b.id);
}

export const slotVisible = (s: State, i: number) =>
  SLOTS[i].tier === 1 || SLOTS.every((d, k) => d.tier !== SLOTS[i].tier - 1 || s.slots[k].unlocked);

// ---------------------------------------------------------------- state

export function freshState(seed = 1): State {
  const slots: Slot[] = SLOTS.map((d) => ({
    unlocked: d.price === 0,
    gen: 0,
    rock: null,
    arriveAt: 0,
    crumble: 0,
  }));
  slots.forEach((slot, i) => {
    if (slot.unlocked) {
      slot.rock = generateRock(i, 0, seed);
      slot.gen = 1;
    }
  });
  return {
    version: 2,
    seed,
    tick: 0,
    credits: 0,
    earned: 0,
    slots,
    machines: [],
    nextId: 1,
    docks: DOCKS_START,
    laserLevel: 1,
    tractorLevel: 0,
    flights: [],
    laser: null,
    stats: { laserBroken: 0, drillBroken: 0, crumbleBroken: 0, delivered: 0, bars: 0 },
    events: [],
  };
}

export const byId = (s: State, id: number) => s.machines.find((m) => m.id === id);
export const drills = (s: State) => s.machines.filter((m): m is Drill => m.kind === 'drill');
export const smelters = (s: State) => s.machines.filter((m): m is Smelter => m.kind === 'smelter');

export const priceOf = (s: State, kind: Machine['kind']) =>
  kind === 'drill' ? drillPrice(drills(s).length) : smelterPrice(smelters(s).length);

export function upgradeCost(m: Machine): number | null {
  if (m.kind === 'drill') return m.level >= DRILL_MAX_LEVEL ? null : drillUpgradeCost(m.level);
  return m.level >= SMELTER_MAX_LEVEL ? null : smelterUpgradeCost(m.level);
}

/** Tier steps bought and still owned across the factory: the only input to the widen price. */
export const tiersBought = (s: State) => s.machines.reduce((n, m) => n + m.tierBought, 0);

export function widenPrice(s: State, m: Machine): number | null {
  return m.tier >= BELT_TIER_MAX ? null : widenCost(tiersBought(s));
}

export function hubCost(s: State, what: HubUpgrade): number | null {
  if (what === 'laser')
    return s.laserLevel >= LASER_POWER.length ? null : LASER_COST[s.laserLevel - 1];
  if (what === 'docks') return s.docks >= DOCKS_MAX ? null : dockCost(s.docks);
  return s.tractorLevel >= TRACTOR_MAX ? null : tractorCost(s.tractorLevel);
}

export const sellValue = (m: Machine) => Math.floor(m.spent * SELL_REFUND);

// ---------------------------------------------------------------- links

const dockUsed = (s: State, index: number, except?: Machine) =>
  s.machines.some((m) => m !== except && m.out?.to.kind === 'dock' && m.out.to.index === index);

const feeds = (m: Machine, id: number) => !!m.out && m.out.to.kind !== 'dock' && m.out.to.id === id;

/** Machines whose belts end at this machine, in id order (the zipper's input order). */
export const inputsOf = (s: State, id: number) =>
  s.machines.filter((m) => feeds(m, id)).sort((a, b) => a.id - b.id);
export const smelterInputsOf = inputsOf;

/** Input belts a machine can take: 2 for a drill junction, 2/3/4 for a smelter by level. */
export const inputCap = (m: Machine) =>
  m.kind === 'drill' ? DRILL_INPUTS : smelterInputs(m.level);

export const sameTarget = (a: Target, b: Target) =>
  a.kind === b.kind &&
  (a.kind === 'dock' ? a.index === (b as typeof a).index : a.id === (b as typeof a).id);

/** True if following belts downstream from `t` reaches machine `id` (a link would loop). */
export function reaches(s: State, t: Target | undefined, id: number): boolean {
  for (let guard = 0; t && guard <= s.machines.length; guard++) {
    if (t.kind === 'dock') return false;
    if (t.id === id) return true;
    t = byId(s, t.id)?.out?.to;
  }
  return false;
}

/**
 * The target matrix: a drill may feed a free dock, a smelter or a drill with a free input; a
 * smelter may feed a free dock or a drill with a free input (never a smelter). No loops.
 */
export function canTarget(s: State, m: Machine, t: Target): boolean {
  if (t.kind === 'dock') return t.index >= 0 && t.index < s.docks && !dockUsed(s, t.index, m);
  const tm = byId(s, t.id);
  if (!tm || tm.kind !== t.kind || tm.id === m.id) return false;
  if (m.kind === 'smelter' && tm.kind === 'smelter') return false;
  if (inputsOf(s, tm.id).filter((x) => x !== m).length >= inputCap(tm)) return false;
  return !reaches(s, t, m.id);
}

function autoLink(s: State, m: Machine): boolean {
  const p = machinePos(m);
  let best: Target | null = null,
    bestD = Infinity;
  for (let i = 0; i < s.docks; i++) {
    const t: Target = { kind: 'dock', index: i };
    if (!canTarget(s, m, t)) continue;
    const q = dockPos(i);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD - 1e-6) {
      bestD = d;
      best = t;
    }
  }
  if (!best) return false;
  m.out = { to: best, length: 1, items: [] };
  m.out.length = beltLength(s, m);
  s.events.push({ type: 'route', id: m.id });
  return true;
}

/** Unlinked machines retry a free dock (never a machine): smelters first, then placement order. */
function relinkAll(s: State) {
  const waiting = s.machines
    .filter((m) => !m.out)
    .sort((a, b) => (a.kind === b.kind ? a.id - b.id : a.kind === 'smelter' ? -1 : 1));
  for (const m of waiting) autoLink(s, m);
}

/** Recompute belt lengths after a change; items keep their relative place. */
function relayout(s: State) {
  for (const m of s.machines) {
    if (!m.out) continue;
    const next = beltLength(s, m);
    if (Math.abs(next - m.out.length) < 1e-6) continue;
    const k = next / m.out.length;
    for (const it of m.out.items) it.pos = Math.min(next, it.pos * k);
    m.out.length = next;
  }
}

// ---------------------------------------------------------------- commands

export type Result = true | string;

export function setLaser(s: State, slot: number, p: Point) {
  if (!s.slots[slot]?.unlocked) return;
  if (s.laser && s.laser.slot === slot) {
    s.laser.x = p.x;
    s.laser.y = p.y;
  } else s.laser = { slot, x: p.x, y: p.y, cell: -1 };
}

export function clearLaser(s: State) {
  s.laser = null;
}

export function freeSockets(s: State, slot: number, except?: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < SLOTS[slot].sockets; k++) {
    if (
      !s.machines.some(
        (m) => m.kind === 'drill' && m.id !== except && m.slot === slot && m.socket === k
      )
    )
      out.push(k);
  }
  return out;
}

/** The free socket nearest to a point, on an unlocked slot. */
export function nearestSocket(s: State, p: Point, maxDist: number, except?: number) {
  let best: { slot: number; socket: number } | null = null,
    bestD = maxDist;
  SLOTS.forEach((_, i) => {
    if (!s.slots[i].unlocked) return;
    for (const k of freeSockets(s, i, except)) {
      const q = socketPos(i, k);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = { slot: i, socket: k };
      }
    }
  });
  return best as { slot: number; socket: number } | null;
}

export function smelterSpotOk(s: State, p: Point, except?: number): boolean {
  if (Math.hypot(p.x, p.y) < DOCK_RADIUS + SMELTER_RADIUS + 6) return false;
  if (p.x < -330 || p.x > 330 || p.y > 110 || p.y < -1150) return false;
  for (let i = 0; i < SLOTS.length; i++) {
    const d = SLOTS[i];
    if (!slotVisible(s, i)) continue;
    if (Math.hypot(p.x - d.x, p.y - d.y) < d.r * CELL + SMELTER_RADIUS + 2) return false;
  }
  for (const m of s.machines) {
    if (m.id === except) continue;
    const q = machinePos(m);
    const min = m.kind === 'smelter' ? SMELTER_RADIUS * 2 + 8 : SMELTER_RADIUS + DRILL_RADIUS * 0.7;
    if (Math.hypot(p.x - q.x, p.y - q.y) < min) return false;
  }
  return true;
}

/** The simulation's own splice check: generous, since the UI snaps within screen tolerances. */
export const SPLICE_REACH = 40;

/**
 * Can smelter `sm` (or a new one, `null`) be put into `owner`'s belt near `p`? The owner must be
 * a drill (a smelter never feeds a smelter), its target must accept a smelter, and no loop.
 */
export function canSplice(s: State, owner: Machine | undefined, sm: Smelter | null, p: Point) {
  if (!owner?.out || owner.kind !== 'drill') return false;
  const old = owner.out.to;
  if (old.kind === 'smelter') return false;
  const b = beltDistance(s, owner, p);
  if (!b || b.d > SPLICE_REACH) return false;
  if (sm) {
    if (sm.out || owner.id === sm.id) return false;
    if (inputsOf(s, sm.id).length >= inputCap(sm)) return false;
    if (reaches(s, old, sm.id)) return false;
  }
  return true;
}

function pay(s: State, cost: number): boolean {
  if (s.credits < cost) return false;
  s.credits -= cost;
  return true;
}

const base = () => ({ tier: 1, tierBought: 0, rr: 0, fullT: 0, full: false });

export function buildDrill(s: State, slot: number, socket: number): Result {
  if (!s.slots[slot]?.unlocked) return 'locked';
  if (!freeSockets(s, slot).includes(socket)) return 'occupied';
  const cost = priceOf(s, 'drill');
  if (!pay(s, cost)) return 'credits';
  const d: Drill = {
    id: s.nextId++,
    kind: 'drill',
    level: 1,
    spent: cost,
    out: null,
    ...base(),
    slot,
    socket,
    buffer: [],
    cell: -1,
  };
  s.machines.push(d);
  autoLink(s, d);
  s.events.push({ type: 'build', id: d.id });
  return true;
}

/** Put smelter `sm` into `owner`'s line: owner → smelter → owner's old target. */
function spliceInto(s: State, sm: Smelter, owner: Machine) {
  const old = owner.out!.to;
  sm.out = { to: old, length: 1, items: [] };
  owner.out!.to = { kind: 'smelter', id: sm.id };
  relayout(s);
  s.events.push({ type: 'route', id: owner.id }, { type: 'route', id: sm.id });
}

/**
 * Place a smelter. With `splice` (a drill's id), it is dropped on that drill's belt and goes
 * into that line; otherwise it stands alone and takes a free dock if there is one.
 */
export function buildSmelter(s: State, p: Point, splice?: number | null): Result {
  if (!smelterSpotOk(s, p)) return 'blocked';
  const owner = splice == null ? undefined : byId(s, splice);
  if (splice != null && !canSplice(s, owner, null, p)) return 'invalid';
  const cost = priceOf(s, 'smelter');
  if (!pay(s, cost)) return 'credits';
  const m: Smelter = {
    id: s.nextId++,
    kind: 'smelter',
    level: 1,
    spent: cost,
    out: null,
    ...base(),
    x: p.x,
    y: p.y,
    queue: [],
    job: null,
    ready: [],
    idle: 0,
    jamT: 0,
    jam: false,
  };
  s.machines.push(m);
  if (owner) spliceInto(s, m, owner);
  else autoLink(s, m);
  s.events.push({ type: 'build', id: m.id });
  return true;
}

export function route(s: State, id: number, to: Target): Result {
  const m = byId(s, id);
  if (!m) return 'missing';
  if (m.out && sameTarget(m.out.to, to)) return true;
  if (!canTarget(s, m, to)) return 'invalid';
  if (m.out) m.out.to = to;
  else m.out = { to, length: 1, items: [] };
  relayout(s);
  if (m.out.length === 1) m.out.length = beltLength(s, m);
  relinkAll(s);
  s.events.push({ type: 'route', id });
  return true;
}

export function upgrade(s: State, id: number): Result {
  const m = byId(s, id);
  if (!m) return 'missing';
  const cost = upgradeCost(m);
  if (cost === null) return 'max';
  if (!pay(s, cost)) return 'credits';
  m.level++;
  m.spent += cost;
  s.events.push({ type: 'upgrade', id });
  return true;
}

/** Widen a machine's output belt by one tier (bigger bundles). The tier stays with the machine. */
export function widen(s: State, id: number): Result {
  const m = byId(s, id);
  if (!m) return 'missing';
  const cost = widenPrice(s, m);
  if (cost === null) return 'max';
  if (!pay(s, cost)) return 'credits';
  m.tier++;
  m.tierBought++;
  m.spent += cost;
  s.events.push({ type: 'widen', id });
  return true;
}

const onBelt = (b: Belt | null) => (b?.items ?? []).reduce((n, it) => n + it.ores.length, 0);

/**
 * Sell a machine for half of what was spent on it. Its line heals: the lowest-id input takes
 * over its target if the target matrix and input caps allow it, and the other inputs chain
 * into that heir while it has room. Anything that can't be relinked becomes unlinked.
 */
export function sell(s: State, id: number): Result {
  const m = byId(s, id);
  if (!m) return 'missing';
  const p = machinePos(m);
  let lost =
    onBelt(m.out) +
    (m.kind === 'drill'
      ? m.buffer.length
      : m.queue.length + (m.job ? (m.job.pair ? 2 : 1) : 0) + m.ready.length);
  const inputs = inputsOf(s, m.id);
  const target = m.out?.to ?? null;
  s.machines = s.machines.filter((x) => x !== m);
  const unlink = (x: Machine) => {
    lost += onBelt(x.out);
    x.out = null;
  };
  const [heir, ...rest] = inputs;
  if (heir) {
    if (target && canTarget(s, heir, target)) {
      heir.out!.to = target;
      s.events.push({ type: 'route', id: heir.id });
    } else unlink(heir);
    for (const x of rest) {
      const t: Target = { kind: heir.kind, id: heir.id } as Target;
      if (heir.out && canTarget(s, x, t)) {
        x.out!.to = t;
        s.events.push({ type: 'route', id: x.id });
      } else unlink(x);
    }
  }
  s.credits += sellValue(m);
  relayout(s);
  relinkAll(s);
  s.events.push({ type: 'sell', id, x: p.x, y: p.y, lost });
  return true;
}

export function moveDrill(s: State, id: number, slot: number, socket: number): Result {
  const m = byId(s, id);
  if (!m || m.kind !== 'drill') return 'missing';
  if (!s.slots[slot]?.unlocked) return 'locked';
  if (!freeSockets(s, slot, id).includes(socket)) return 'occupied';
  m.slot = slot;
  m.socket = socket;
  m.cell = -1;
  relayout(s);
  s.events.push({ type: 'move', id });
  return true;
}

/** Move a smelter; its links stretch along. A smelter with no output may be dropped on a belt. */
export function moveSmelter(s: State, id: number, p: Point, splice?: number | null): Result {
  const m = byId(s, id);
  if (!m || m.kind !== 'smelter') return 'missing';
  if (!smelterSpotOk(s, p, id)) return 'blocked';
  const owner = splice == null ? undefined : byId(s, splice);
  if (splice != null && !canSplice(s, owner, m, p)) return 'invalid';
  m.x = p.x;
  m.y = p.y;
  if (owner) spliceInto(s, m, owner);
  relayout(s);
  s.events.push({ type: 'move', id });
  return true;
}

export function unlockCost(s: State, slot: number): number | null {
  if (!SLOTS[slot] || s.slots[slot].unlocked || !slotVisible(s, slot)) return null;
  return SLOTS[slot].price;
}

export function unlock(s: State, slot: number): Result {
  const cost = unlockCost(s, slot);
  if (cost === null) return 'unavailable';
  if (!pay(s, cost)) return 'credits';
  const st = s.slots[slot];
  st.unlocked = true;
  st.rock = null;
  st.arriveAt = s.tick + Math.round(TOW_SECONDS * TICK_HZ);
  s.events.push({ type: 'unlock', slot });
  return true;
}

export function upgradeHub(s: State, what: HubUpgrade): Result {
  const cost = hubCost(s, what);
  if (cost === null) return 'max';
  if (!pay(s, cost)) return 'credits';
  if (what === 'laser') s.laserLevel++;
  else if (what === 'docks') s.docks++;
  else s.tractorLevel++;
  relinkAll(s);
  s.events.push({ type: 'hub', what });
  return true;
}

// ---------------------------------------------------------------- tick

function earn(s: State, value: number) {
  s.credits += value;
  s.earned += value;
}

function breakCell(
  s: State,
  slotIndex: number,
  index: number,
  by: 'laser' | 'drill' | 'crumble'
): Ore {
  const slot = s.slots[slotIndex];
  const rock = slot.rock!;
  const ore = rock.cells[index] as Ore;
  const p = cellPos(slotIndex, rock, index);
  rock.cells[index] = 0;
  rock.work[index] = 0;
  rock.remaining--;
  s.events.push({ type: 'break', slot: slotIndex, cell: index, ore, x: p.x, y: p.y, by });
  if (by === 'laser') s.stats.laserBroken++;
  else if (by === 'drill') s.stats.drillBroken++;
  else s.stats.crumbleBroken++;
  if (by !== 'drill') {
    const dist = Math.hypot(p.x, p.y);
    const secs = Math.min(FLIGHT_MAX, Math.max(FLIGHT_MIN, dist / FLIGHT_SPEED));
    s.flights.push({
      ore,
      value: ORES[ore].value,
      x: p.x,
      y: p.y,
      t0: s.tick,
      t1: s.tick + Math.round(secs * TICK_HZ),
    });
  }
  if (!slot.crumble && rock.remaining > 0 && rock.remaining < rock.total * CRUMBLE_AT) {
    slot.crumble = Math.max(1, Math.ceil(rock.remaining / (CRUMBLE_SECONDS * TICK_HZ)));
    s.events.push({ type: 'crumble', slot: slotIndex });
  }
  return ore;
}

function slotsTick(s: State) {
  s.slots.forEach((slot, i) => {
    if (!slot.unlocked) return;
    if (!slot.rock) {
      if (s.tick >= slot.arriveAt) {
        slot.rock = generateRock(i, slot.gen, s.seed);
        slot.gen++;
        s.events.push({ type: 'arrive', slot: i });
      }
      return;
    }
    const rock = slot.rock;
    if (slot.crumble) {
      const def = SLOTS[i];
      const order = rock.cells
        .map((c, k) => (c ? k : -1))
        .filter((k) => k >= 0)
        .map((k) => {
          const p = cellPos(i, rock, k);
          return { k, d: Math.hypot(p.x - def.x, p.y - def.y) };
        })
        .sort((a, b) => b.d - a.d || a.k - b.k);
      for (const c of order.slice(0, slot.crumble)) breakCell(s, i, c.k, 'crumble');
    }
    if (rock.remaining <= 0) {
      slot.rock = null;
      slot.crumble = 0;
      slot.arriveAt = s.tick + Math.round(arrivalSeconds(s.tractorLevel) * TICK_HZ);
      for (const d of drills(s)) if (d.slot === i) d.cell = -1;
      if (s.laser?.slot === i) s.laser.cell = -1;
    }
  });
}

function laserTick(s: State) {
  const L = s.laser;
  if (!L) return;
  const slot = s.slots[L.slot];
  const rock = slot?.rock;
  if (!rock || slot.crumble) {
    L.cell = -1;
    return;
  }
  L.cell = nearestCell(L.slot, rock, L);
  if (L.cell < 0) return;
  rock.work[L.cell] += LASER_POWER[s.laserLevel - 1] * DT;
  if (rock.work[L.cell] >= ORES[rock.cells[L.cell] as Ore].hardness - 1e-9) {
    breakCell(s, L.slot, L.cell, 'laser');
  }
}

function drillsTick(s: State) {
  for (const d of drills(s)) {
    d.stalled = false;
    if (d.buffer.length >= DRILL_BUFFER) {
      d.stalled = !!s.slots[d.slot].rock && !s.slots[d.slot].crumble;
      continue;
    }
    const slot = s.slots[d.slot];
    const rock = slot.rock;
    if (!rock || slot.crumble) {
      d.cell = -1;
      continue;
    }
    // Work left over after a break carries into the next cell, so fast drills are not
    // rounded down to one cell per tick.
    let budget = drillRate(d.level) * DT;
    while (budget > 1e-9 && d.buffer.length < DRILL_BUFFER && !slot.crumble) {
      if (d.cell < 0 || !rock.cells[d.cell])
        d.cell = nearestCell(d.slot, rock, socketPos(d.slot, d.socket));
      if (d.cell < 0) break;
      const need = ORES[rock.cells[d.cell] as Ore].hardness - rock.work[d.cell];
      const use = Math.min(budget, need);
      rock.work[d.cell] += use;
      budget -= use;
      if (use >= need - 1e-9) {
        d.buffer.push(breakCell(s, d.slot, d.cell, 'drill'));
        d.cell = -1;
      }
    }
    if (budget > 1e-9 && d.buffer.length >= DRILL_BUFFER) d.stalled = true;
  }
}

/** The front bundle of a belt, if it is waiting at the belt's end. */
function waiting(b: Belt | null): BeltItem | null {
  const f = b?.items[0];
  return f && f.pos >= b!.length - 1e-6 ? f : null;
}

function takeFront(b: Belt): Ore {
  const f = b.items[0];
  const ore = f.ores.shift()!;
  if (!f.ores.length) b.items.shift();
  return ore;
}

/**
 * Load each belt that has room at its start. A drill loads as a fair zipper: one chunk at a
 * time, round-robin over its own buffer and each input belt with an item waiting, until the
 * bundle holds the belt's tier. A smelter loads its finished and passing bars. A bundle never
 * mixes values.
 */
function loadBelts(s: State) {
  for (const m of s.machines) {
    const b = m.out;
    if (!b) continue;
    const last = b.items[b.items.length - 1];
    if (last && last.pos < BELT_SPACING) continue;
    const ores: Ore[] = [];
    let mult = 0;
    if (m.kind === 'smelter') {
      while (m.ready.length && ores.length < m.tier && (!mult || m.ready[0].mult === mult)) {
        const bar = m.ready.shift()!;
        mult = bar.mult;
        ores.push(bar.ore);
      }
    } else {
      const inputs = inputsOf(s, m.id);
      const n = 1 + inputs.length;
      while (ores.length < m.tier) {
        let took = false;
        for (let k = 0; k < n; k++) {
          const idx = (m.rr + k) % n;
          if (idx === 0) {
            if (!m.buffer.length || (mult && mult !== 1)) continue;
            ores.push(m.buffer.shift()!);
            mult = 1;
          } else {
            const belt = inputs[idx - 1].out!;
            const f = waiting(belt);
            if (!f || (mult && f.mult !== mult)) continue;
            mult = f.mult;
            ores.push(takeFront(belt));
          }
          m.rr = (idx + 1) % n;
          took = true;
          break;
        }
        if (!took) break;
      }
    }
    if (ores.length) b.items.push({ pos: 0, ores, mult });
  }
}

function moveBelts(s: State) {
  const step = BELT_SPEED * DT;
  for (const m of s.machines) {
    const b = m.out;
    if (!b) continue;
    let max = b.length;
    for (const it of b.items) {
      it.pos = Math.min(it.pos + step, max);
      max = it.pos - BELT_SPACING;
    }
    const front = b.items[0];
    if (front && b.to.kind === 'dock' && front.pos >= b.length - 1e-6) {
      b.items.shift();
      const p = dockPos(b.to.index);
      for (const ore of front.ores) {
        const value = ORES[ore].value * front.mult;
        earn(s, value);
        s.stats.delivered++;
        s.events.push({
          type: 'deliver',
          x: p.x,
          y: p.y,
          value,
          ore,
          bar: front.mult > 1,
          dock: b.to.index,
        });
      }
    }
  }
}

/** Seconds a smelter holds an unpaired chunk with nothing arriving before smelting it alone. */
const LONE_WAIT = 2;

function smeltersTick(s: State) {
  for (const sm of smelters(s)) {
    // Intake: as many chunks per tick as there is room for, one per input belt in turn.
    // Bars pass straight through to the output; raw chunks queue for pairing.
    const inputs = inputsOf(s, sm.id);
    const n = inputs.length;
    let took = true;
    let any = false;
    while (took && n) {
      took = false;
      for (let k = 0; k < n; k++) {
        const idx = (sm.rr + k) % n;
        const belt = inputs[idx].out!;
        const f = waiting(belt);
        if (!f) continue;
        if (f.mult > 1) {
          if (sm.ready.length >= SMELTER_READY) continue;
          const mult = f.mult;
          sm.ready.push({ ore: takeFront(belt), mult });
        } else {
          if (sm.queue.length >= SMELTER_QUEUE) continue;
          sm.queue.push(takeFront(belt));
        }
        sm.rr = (idx + 1) % n;
        took = any = true;
        break;
      }
    }
    if (any) sm.idle = 0;
    else sm.idle++;
    // Leftover time carries into the next bar, so fast smelters are not rounded to a bar a tick.
    let budget = DT;
    while (budget > 1e-9) {
      if (!sm.job) {
        if (sm.ready.length >= SMELTER_READY || !sm.queue.length) break;
        const q = sm.queue;
        let i = 0,
          j = -1;
        for (; i < q.length && j < 0; i++) j = q.indexOf(q[i], i + 1);
        if (j >= 0) {
          const ore = q[i - 1];
          q.splice(j, 1);
          q.splice(i - 1, 1);
          sm.job = { ore, left: smelterTime(sm.level), pair: true };
        } else if (q.length >= SMELTER_QUEUE || sm.idle >= LONE_WAIT * TICK_HZ) {
          sm.job = { ore: q.shift()!, left: smelterTime(sm.level), pair: false };
        } else break;
      }
      const use = Math.min(budget, sm.job.left);
      sm.job.left -= use;
      budget -= use;
      if (sm.job.left <= 1e-9) {
        sm.ready.push({ ore: sm.job.ore, mult: sm.job.pair ? BAR_VALUE : LONE_BAR_VALUE });
        s.stats.bars++;
        s.events.push({ type: 'smelt', id: sm.id, ore: sm.job.ore });
        sm.job = null;
      }
    }
  }
}

/** Sustained pressure with about a second of hysteresis each way, so chips never flicker. */
function pressure(t: number, flag: boolean, on: boolean): [number, boolean] {
  const next = Math.max(0, Math.min(1.5, t + (on ? DT : -DT)));
  return [next, next >= 1 ? true : next <= 0 ? false : flag];
}

/**
 * Saturated ("full"): a machine's belt is flowing at capacity and still can't take everything
 * that reaches it (its drill had to stop, or its input belts wait). A belt that is itself
 * stopped at a downstream machine is not "full": the limit is further down the line.
 * Blocked ("jam"): items wait at a smelter because its queue is full.
 */
function pressureTick(s: State) {
  for (const m of s.machines) {
    const inputs = inputsOf(s, m.id);
    const inWait = inputs.some((x) => waiting(x.out));
    const downstream = !!m.out && m.out.to.kind !== 'dock' && !!waiting(m.out);
    if (m.kind === 'drill') {
      const on = !!m.out && !downstream && (!!m.stalled || inWait);
      [m.fullT, m.full] = pressure(m.fullT, m.full, on);
    } else {
      const on = !!m.out && !downstream && m.ready.length >= SMELTER_READY;
      [m.fullT, m.full] = pressure(m.fullT, m.full, on);
      [m.jamT, m.jam] = pressure(m.jamT, m.jam, inWait && !m.full);
    }
  }
}

function flightsTick(s: State) {
  if (!s.flights.length) return;
  const keep: Flight[] = [];
  for (const f of s.flights) {
    if (s.tick >= f.t1) {
      earn(s, f.value);
      s.stats.delivered++;
      s.events.push({
        type: 'deliver',
        x: 0,
        y: 0,
        value: f.value,
        ore: f.ore,
        bar: false,
        dock: -1,
      });
    } else keep.push(f);
  }
  s.flights = keep;
}

export function step(s: State) {
  s.tick++;
  slotsTick(s);
  laserTick(s);
  drillsTick(s);
  loadBelts(s);
  moveBelts(s);
  smeltersTick(s);
  pressureTick(s);
  flightsTick(s);
}

export function run(s: State, ticks: number) {
  for (let i = 0; i < ticks; i++) step(s);
}

/** Credits still travelling through the factory (buffers, belts, smelters, flights). */
export function inTransitValue(s: State): number {
  let v = s.flights.reduce((a, f) => a + f.value, 0);
  for (const m of s.machines) {
    for (const it of m.out?.items ?? []) for (const ore of it.ores) v += ORES[ore].value * it.mult;
    if (m.kind === 'drill') v += m.buffer.reduce((a, o) => a + ORES[o].value, 0);
    else {
      v += m.queue.reduce((a, o) => a + ORES[o].value, 0) * (BAR_VALUE / 2);
      if (m.job) v += ORES[m.job.ore].value * (m.job.pair ? BAR_VALUE : LONE_BAR_VALUE);
      for (const b of m.ready) v += ORES[b.ore].value * b.mult;
    }
  }
  return v;
}

// ---------------------------------------------------------------- command log

/** Every player command by a stable name, so inputs can be recorded and replayed as a witness. */
export const COMMANDS = {
  setLaser,
  clearLaser,
  buildDrill,
  buildSmelter,
  route,
  upgrade,
  widen,
  sell,
  moveDrill,
  moveSmelter,
  unlock,
  upgradeHub,
} as const;

export type CommandName = keyof typeof COMMANDS;
/** [tick at which it was applied (before the next step), name, arguments]. */
export type LoggedCommand = [number, CommandName, unknown[]];

export function applyCommand(s: State, name: CommandName, args: unknown[]): unknown {
  return (COMMANDS[name] as (s: State, ...a: unknown[]) => unknown)(s, ...args);
}

/** Re-run a command log from a fresh seed up to `untilTick`. */
export function replay(seed: number, log: LoggedCommand[], untilTick: number): State {
  const s = freshState(seed);
  for (const [tick, name, args] of log) {
    while (s.tick < tick) {
      step(s);
      s.events.length = 0;
    }
    applyCommand(s, name, args);
    s.events.length = 0;
  }
  while (s.tick < untilTick) {
    step(s);
    s.events.length = 0;
  }
  return s;
}
