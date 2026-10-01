import {
  ALLOY_MULT,
  arrivalSeconds,
  BAR_VALUE,
  BELT_SPACING,
  BELT_SPEED,
  BELT_TIER_MAX,
  CELL,
  COPPER,
  CRYSTAL,
  CRUMBLE_AT,
  CRUMBLE_FLIGHT_MAX,
  DEEP_CRUMBLE_AT,
  DEPTH,
  AUTO_TOW_SECONDS,
  SLOW_PRICE,
  CRUMBLE_SECONDS,
  dockCost,
  DOCK_ANGLES,
  DOCK_RADIUS,
  HUB_RADIUS,
  CROSS_TOUCH,
  DOCKS_MAX,
  DOCKS_START,
  DRILL_BUFFER,
  DRILL_INPUTS,
  DRILL_MAX_LEVEL,
  DRILL_RADIUS,
  DRILL_SPACING,
  drillPrice,
  classicDrillPrice,
  drillRate,
  drillUpgradeCost,
  DT,
  FACTORY_MAX_LEVEL,
  FACTORY_PAIRS,
  FACTORY_READY,
  FACTORY_REFUSE_ROCK,
  FACTORY_STOCK,
  factoryInputs,
  factoryPrice,
  factoryTime,
  factoryUpgradeCost,
  FLIGHT_MAX,
  FLIGHT_MIN,
  FLIGHT_SPEED,
  LASER_COST,
  LASER_POWER,
  LONE_BAR_VALUE,
  type Ore,
  ORES,
  type VeinPlan,
  PREMIUM_MULT,
  SELL_REFUND,
  type RockShape,
  SLOTS,
  SMELTER_MAX_LEVEL,
  SMELTER_QUEUE,
  SMELTER_RADIUS,
  SMELTER_READY,
  smelterInputs,
  smelterPrice,
  smelterTime,
  smelterUpgradeCost,
  RIM_GAP,
  ROCK,
  TICK_HZ,
  TIER_ORE,
  TOW_SECONDS,
  TRACTOR_MAX,
  tractorCost,
  widenCost,
} from './config';
import { useSector } from './sector';
import { findPlates, type Plate, type PlateSide, type Segment } from './crossings';

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
  /**
   * Slow-burn rocks only: layers a fresh cell holds, each cell's layers left (0 = empty), their
   * sum when the rock arrived and now, and a counter that moves whenever a cell's shade band
   * changes (the renderer's cache key). Absent on a depth-1 rock, which plays as before.
   */
  depth?: number;
  layers?: number[];
  layersTotal?: number;
  layersLeft?: number;
  bands?: number;
}

/** A cell's shade band from its layers left: 0 intact, 1 scratched, 2 half, 3 a quarter or less. */
export const shadeBand = (left: number, depth: number) =>
  left >= depth ? 0 : left > depth / 2 ? 1 : left > depth / 4 ? 2 : 3;

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

/** A belt ends at a hub dock or at another machine (a smelter, a factory, or a drill junction). */
export type Target =
  | { kind: 'dock'; index: number }
  | { kind: 'smelter'; id: number }
  | { kind: 'factory'; id: number }
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
  /** An alloy bundle: the pair's higher ore (`ores` holds the lower one) and each alloy's value. */
  alloy?: Ore;
  v?: number;
  /** Ticks this bundle has waited its turn at a crossing (absent or 0 when it isn't waiting). */
  w?: number;
}

export interface Belt {
  to: Target;
  /** Bend posts the player placed, in order from the machine (at most `MAX_POSTS`). */
  via?: Point[];
  length: number;
  /** Front (largest pos) first. */
  items: BeltItem[];
}

/** A finished (or passing) bar waiting at a smelter for its output belt. */
export interface Bar {
  ore: Ore;
  mult: number;
  /** An alloy (or one passing through): its pair's higher ore and its value in credits. */
  alloy?: Ore;
  v?: number;
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
  /** Smoothed share of load chances that left items waiting with the bundle full, and its flag. */
  fullT: number;
  full: boolean;
  /** Ticks until the belt may load again: capacity never depends on the belt's length. */
  cd: number;
  /** Consecutive ticks the belt's front has waited at a downstream machine. */
  wait: number;
  /** Ticks since the belt's front last waited at a downstream machine (capped). */
  heldAgo: number;
  /** Seconds of "bundles wait their turn at a crossing" (0–1) and its hysteresis flag. */
  crossT: number;
  cross: boolean;
}

export interface Drill extends MachineBase {
  kind: 'drill';
  slot: number;
  /** Where on the rock's rim the drill sits: radians from the rock's centre, y down. */
  angle: number;
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
  /** Smoothed share of ticks an input was refused because the queue was full, and its flag. */
  jamT: number;
  jam: boolean;
}

/** A factory pairs two paired bars of different ores into an alloy (the factories experiment). */
export interface Factory extends MachineBase {
  kind: 'factory';
  x: number;
  y: number;
  /** Paired bars waiting for a partner, with the tick each arrived. */
  stock: (Bar & { t: number })[];
  /** Pairs waiting for the worker. */
  pairs: [Bar, Bar][];
  job: { pair: [Bar, Bar]; left: number } | null;
  /** Alloys and passing items waiting for the output belt. */
  ready: Bar[];
  /** Smoothed share of intakes that were raw chunks only (the "smelt it first" hint). */
  rawT: number;
}

export type Machine = Drill | Smelter | Factory;

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
      /** Chunks this break yields, when more than one (a crumbling slow-burn cell). */
      chunks?: number;
    }
  | {
      type: 'deliver';
      x: number;
      y: number;
      value: number;
      ore: Ore;
      bar: boolean;
      dock: number;
      alloy?: Ore;
    }
  | { type: 'alloy'; id: number; ore: Ore; alloy: Ore }
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
  version: 3;
  seed: number;
  /** Belts that touch share a plate and take turns (the crossings experiment). */
  crossings: boolean;
  /** Transient: a save from before crossings was loaded, so the game explains them once. */
  crossingsNotice?: boolean;
  /** Drills priced by the rock tier they stand on (the drill-prices experiment), else classic. */
  rockPrices: boolean;
  /** The factories experiment: the tray offers factories (off by default during the prototype). */
  factories: boolean;
  /** The sectors prototype: this game's field was generated from its seed, else the classic one. */
  sector: boolean;
  /** Slow-burn rocks (docs/ROCKHOPPER_SLOW_ROCKS.md): deep rocks, auto-tow, no tractor. */
  slowRocks?: boolean;
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

/**
 * Layers per cell for the rock slot `slotIndex` gets as its `gen`th: 1 on a classic game and for
 * the starter rock (the first berth's first rock), else the slot tier's depth.
 */
export function rockDepth(s: { slowRocks?: boolean }, slotIndex: number, gen: number): number {
  if (!s.slowRocks) return 1;
  if (gen === 0 && SLOTS[slotIndex].price === 0) return 1;
  return DEPTH[SLOTS[slotIndex].tier];
}

export function generateRock(slotIndex: number, gen: number, worldSeed: number, depth = 1): Rock {
  const def = SLOTS[slotIndex];
  const r = def.r;
  const w = 2 * r + 3;
  const seed = Math.floor(hash(slotIndex * 977 + gen * 31, worldSeed, 13) * 1e9);
  // Veins stay put for the slot: the outline changes between rocks, the richness field doesn't,
  // so a drill aimed at a vein keeps paying off after every respawn. (Generation 0 is unchanged.)
  const veins = Math.floor(hash(slotIndex * 977, worldSeed, 13) * 1e9);
  const form = def.shape ? shapeForm(def.shape, r) : null;
  const cells = new Array<number>(w * w).fill(0);
  const inside: { i: number; n: number; t: number }[] = [];
  for (let j = 0; j < w; j++) {
    for (let i = 0; i < w; i++) {
      const x = i - (r + 1),
        y = j - (r + 1);
      const ang = Math.atan2(y, x);
      const wobble = 0.84 + 0.2 * vnoise(Math.cos(ang) * 2.2 + 9, Math.sin(ang) * 2.2 + 9, seed, 1);
      if (form) {
        // Sector forms stay inside the classic grid, so drills on the rim never sit on a cell.
        if (Math.hypot(x, y) > Math.min(r + 0.75, r * form.edge(ang) * wobble)) continue;
        if (form.bite && Math.hypot(x - form.bite.x, y - form.bite.y) < form.bite.r) continue;
      } else if (Math.hypot(x, y) > r * wobble) continue;
      const noise = vnoise(x + 40, y + 40, veins + 5, 2.6);
      inside.push({
        i: j * w + i,
        n: def.veins ? richness(def.veins, x, y, r, noise) : noise,
        t: vnoise(x + 70, y + 70, veins + 17, 3.4),
      });
    }
  }
  const tier = TIER_ORE[def.tier];
  const ores = [...tier.ores, def.signature, def.signature];
  // Ore cells are the richest share of this rock's own cells, so richness is exact for the tier.
  // The richness field is the slot's own, so veins barely move between respawns.
  const oreCount = Math.round(inside.length * tier.share);
  const byRichness = [...inside].sort((a, b) => b.n - a.n || a.i - b.i);
  const oreCells = new Set(byRichness.slice(0, oreCount).map((c) => c.i));
  for (const c of inside) {
    cells[c.i] = oreCells.has(c.i)
      ? ores[Math.min(ores.length - 1, Math.floor(c.t * ores.length))]
      : 1;
  }
  const rock: Rock = {
    r,
    w,
    cells,
    work: new Array<number>(w * w).fill(0),
    total: inside.length,
    remaining: inside.length,
  };
  if (depth > 1) {
    rock.depth = depth;
    rock.layers = cells.map((c) => (c ? depth : 0));
    rock.layersTotal = rock.layersLeft = inside.length * depth;
    rock.bands = 0;
  }
  return rock;
}

/** A sector rock's outline, as a radius factor by angle, and the bite taken out of a bitten one. */
function shapeForm(shape: RockShape, r: number) {
  const turn = (a: number) => a - shape.angle;
  switch (shape.kind) {
    case 'oval':
      return {
        edge: (a: number) => 1 / Math.hypot(Math.cos(turn(a)) / 1.15, Math.sin(turn(a)) / 0.8),
      };
    case 'peanut':
      return { edge: (a: number) => 0.74 + 0.4 * Math.pow(Math.abs(Math.cos(turn(a))), 1.4) };
    case 'bitten':
      return {
        edge: () => 1.08,
        bite: { x: Math.cos(shape.angle) * r, y: Math.sin(shape.angle) * r, r: r * 0.55 },
      };
    default:
      return { edge: () => 1 };
  }
}

/** Richness by cell for a sector's vein plan: the richest share of cells becomes ore. */
function richness(plan: VeinPlan, x: number, y: number, r: number, noise: number): number {
  const c = Math.cos(plan.angle),
    s = Math.sin(plan.angle),
    d = Math.hypot(x, y) / r;
  switch (plan.kind) {
    case 'core':
      return -d + 0.45 * noise;
    case 'crust':
      return d + 0.45 * noise;
    case 'side':
      return (x * c + y * s) / r + 0.5 * noise;
    case 'seam':
      return -Math.abs((-x * s + y * c) / r - (plan.offset ?? 0)) + 0.3 * noise;
    case 'pockets': {
      const sd = 2 * 0.3 * 0.3;
      let best = 0;
      for (const p of plan.pockets ?? [])
        best = Math.max(best, Math.exp(-((x / r - p.x) ** 2 + (y / r - p.y) ** 2) / sd));
      return best + 0.25 * noise;
    }
    default:
      return noise;
  }
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

/**
 * The first `n` cells a drill at `p` would dig, nearest first: drills always take the nearest
 * remaining cell, so this is the order it eats into the rock (other drills aside).
 */
export function firstCells(slotIndex: number, rock: Rock, p: Point, n: number): number[] {
  const def = SLOTS[slotIndex];
  const lx = (p.x - def.x) / CELL + rock.r + 1,
    ly = (p.y - def.y) / CELL + rock.r + 1;
  const out: { k: number; d: number }[] = [];
  for (let k = 0; k < rock.cells.length; k++) {
    if (!rock.cells[k]) continue;
    const dx = (k % rock.w) - lx,
      dy = Math.floor(k / rock.w) - ly;
    out.push({ k, d: dx * dx + dy * dy });
  }
  return out
    .sort((a, b) => a.d - b.d || a.k - b.k)
    .slice(0, n)
    .map((c) => c.k);
}

// ---------------------------------------------------------------- geometry

/** Fixed rim sockets per slot from before free placement: saves and tests still name them. */
export const LEGACY_SOCKETS = [3, 3, 3, 4, 4, 5, 5, 6];

export function legacySocketAngle(slotIndex: number, k: number): number {
  return ((90 + (360 / LEGACY_SOCKETS[slotIndex]) * k) * Math.PI) / 180;
}

/** Radius of the rim drills sit on, from the rock's centre. */
export const rimRadius = (slotIndex: number) => SLOTS[slotIndex].r * CELL + RIM_GAP;

export function rimPos(slotIndex: number, angle: number): Point {
  const def = SLOTS[slotIndex];
  const d = rimRadius(slotIndex);
  return { x: def.x + Math.cos(angle) * d, y: def.y + Math.sin(angle) * d };
}

/** An angle in [0, 2π). */
export const normAngle = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

export function dockPos(index: number): Point {
  const a = (DOCK_ANGLES[index] * Math.PI) / 180;
  return { x: Math.cos(a) * DOCK_RADIUS, y: Math.sin(a) * DOCK_RADIUS };
}

export function machinePos(m: Machine): Point {
  return m.kind === 'drill' ? rimPos(m.slot, m.angle) : { x: m.x, y: m.y };
}

export function targetPos(s: State, t: Target): Point | null {
  if (t.kind === 'dock') return dockPos(t.index);
  const m = byId(s, t.id);
  return m ? machinePos(m) : null;
}

/** Belt start and end, trimmed to the machine bodies. */
export function beltEnds(s: State, m: Machine): { a: Point; b: Point } | null {
  const path = beltPath(s, m);
  return path ? { a: path[0], b: path[path.length - 1] } : null;
}

/** A belt's polyline: from the machine's rim, through its bend posts, to the target's rim. */
export function beltPath(s: State, m: Machine): Point[] | null {
  if (!m.out) return null;
  const q = targetPos(s, m.out.to);
  return q ? pathBetween(m, machinePos(m), m.out.via ?? [], q, m.out.to.kind) : null;
}

function pathBetween(m: Machine, p: Point, via: Point[], q: Point, t: Target['kind']): Point[] {
  if (!via.length) {
    const e = endsBetween(m, p, q, t);
    return [e.a, e.b];
  }
  const head = endsBetween(m, p, via[0], 'dock').a;
  const tail = endsBetween(m, via[via.length - 1], q, t).b;
  return [head, ...via.map((v) => ({ x: v.x, y: v.y })), tail];
}

export function pathLength(pts: Point[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++)
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

/** The point `d` along a polyline, with its piece's direction. */
export function pointAlong(pts: Point[], d: number) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= L || i === pts.length - 1) {
      const f = L > 0 ? Math.max(0, Math.min(1, d / L)) : 0;
      const ux = L > 0 ? (b.x - a.x) / L : 1,
        uy = L > 0 ? (b.y - a.y) / L : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ux, uy, piece: i - 1 };
    }
    d -= L;
  }
  return { x: pts[0].x, y: pts[0].y, ux: 1, uy: 0, piece: 0 };
}

/** The nearest point on a polyline to `p`: its distance, piece and distance along the line. */
function nearestOnPath(pts: Point[], p: Point) {
  let best = { d: Infinity, q: pts[0], piece: 0, along: 0 };
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best.d) best = { d, q, piece: i - 1, along: start + Math.sqrt(L2) * t };
    start += Math.sqrt(dx * dx + dy * dy);
  }
  return best;
}

/** A belt from machine `m` at `p` to a target of this kind at `q`, trimmed to the bodies. */
function endsBetween(m: Machine, p: Point, q: Point, t: Target['kind']) {
  const dx = q.x - p.x,
    dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  const start = m.kind === 'drill' ? DRILL_RADIUS * 0.6 : SMELTER_RADIUS * 0.8;
  const end = t === 'dock' ? 0 : t === 'drill' ? DRILL_RADIUS * 0.75 : SMELTER_RADIUS * 0.8;
  return {
    a: { x: p.x + ux * start, y: p.y + uy * start },
    b: { x: q.x - ux * end, y: q.y - uy * end },
  };
}

function beltLength(s: State, m: Machine): number {
  const path = beltPath(s, m);
  return path ? Math.max(1, pathLength(path)) : 1;
}

/** Distance from a point to a machine's belt, the nearest point on it and its fraction (0–1). */
export function beltDistance(s: State, m: Machine, p: Point) {
  const path = beltPath(s, m);
  if (!path) return null;
  const n = nearestOnPath(path, p);
  const L = pathLength(path) || 1;
  return { d: n.d, t: n.along / L, q: n.q, piece: n.piece, along: n.along };
}

/** Belts passing within `tol` of a point, nearest first. */
export function beltsNear(s: State, p: Point, tol: number) {
  const out: { id: number; d: number; t: number; q: Point; piece: number; along: number }[] = [];
  for (const m of s.machines) {
    const b = beltDistance(s, m, p);
    if (b && b.d <= tol) out.push({ id: m.id, ...b });
  }
  return out.sort((a, b) => a.d - b.d || a.id - b.id);
}

export const slotVisible = (s: State, i: number) =>
  SLOTS[i].tier === 1 || SLOTS.every((d, k) => d.tier !== SLOTS[i].tier - 1 || s.slots[k].unlocked);

// ---------------------------------------------------------------- state

export function freshState(seed = 1, sector = false, slowRocks = false): State {
  useSector(seed, sector);
  const slots: Slot[] = SLOTS.map((d) => ({
    unlocked: d.price === 0,
    gen: 0,
    rock: null,
    arriveAt: 0,
    crumble: 0,
  }));
  slots.forEach((slot, i) => {
    if (slot.unlocked) {
      slot.rock = generateRock(i, 0, seed, rockDepth({ slowRocks }, i, 0));
      slot.gen = 1;
    }
  });
  return {
    version: 3,
    seed,
    crossings: true,
    rockPrices: true,
    factories: false,
    sector,
    ...(slowRocks ? { slowRocks: true } : {}),
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
export const factories = (s: State) => s.machines.filter((m): m is Factory => m.kind === 'factory');

/** The tray offers factories once the player owns 2 smelters (one seam for a tech tree). */
export const factoryUnlocked = (s: State) => s.factories && smelters(s).length >= 2;

/** Drills standing on slot `slot`'s rock, leaving out drill `except`. */
export const drillsOnRock = (s: State, slot: number, except?: number) =>
  drills(s).filter((d) => d.id !== except && d.slot === slot).length;

/** A new drill on slot `slot`, leaving out drill `except`: its tier's base, grown per drill there. */
const rockPrice = (s: State, slot: number, except?: number) =>
  drillPrice(SLOTS[slot].tier, drillsOnRock(s, slot, except));

/** Price of a new drill on slot `slot`: by its rock (or classic, with the switch off). */
export const drillPriceOn = (s: State, slot: number) =>
  s.rockPrices ? rockPrice(s, slot) : classicDrillPrice(drills(s).length);

/**
 * Price shown in the tray. Drills: the cheapest unlocked rock (the drag ghost shows the price
 * where it would land). Smelters: 520 × 2^n.
 */
export function priceOf(s: State, kind: Machine['kind']): number {
  if (kind === 'smelter') return smelterPrice(smelters(s).length);
  if (kind === 'factory') return factoryPrice(factories(s).length);
  if (!s.rockPrices) return classicDrillPrice(drills(s).length);
  return Math.min(...SLOTS.flatMap((_, i) => (s.slots[i].unlocked ? [rockPrice(s, i)] : [])));
}

/**
 * Moving drill `id` to slot `slot` costs what a new drill there is pricier by than one where it
 * stands (both counted without it), in any direction: never less than buying in place.
 */
export function moveDrillCost(s: State, id: number, slot: number): number {
  const m = byId(s, id);
  if (!s.rockPrices || !m || m.kind !== 'drill' || m.slot === slot) return 0;
  return Math.max(0, rockPrice(s, slot, id) - rockPrice(s, m.slot, id));
}

export function upgradeCost(m: Machine): number | null {
  if (m.kind === 'drill') return m.level >= DRILL_MAX_LEVEL ? null : drillUpgradeCost(m.level);
  if (m.kind === 'factory')
    return m.level >= FACTORY_MAX_LEVEL ? null : factoryUpgradeCost(m.level);
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
  // Slow-burn rocks have no tow wait to shorten.
  if (s.slowRocks) return null;
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

/** Input belts a machine can take: 2 for a drill junction, 2/3/4 for a smelter, 2/3 for a factory. */
export const inputCap = (m: Machine) =>
  m.kind === 'drill'
    ? DRILL_INPUTS
    : m.kind === 'factory'
      ? factoryInputs(m.level)
      : smelterInputs(m.level);

/** A drill junction: a drill that already takes at least one belt. */
export const isJunction = (s: State, m: Machine) =>
  m.kind === 'drill' && inputsOf(s, m.id).length > 0;

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
export function canTarget(s: State, m: Machine, t: Target, via?: Point[]): boolean {
  return targetWhy(s, m, t, via) === '';
}

/**
 * Why machine `m` can't link to `t`, in a few words, or '' when it can. The belt runs through
 * `via` when given (posts pinned while dragging the link), else through the posts it already has
 * if they still suit the new target (`viaFor`), else straight.
 */
export function targetWhy(s: State, m: Machine, t: Target, via?: Point[]): string {
  if (t.kind === 'factory' && m.kind === 'drill' && !isJunction(s, m)) return 'smelt it first';
  if (!matrixOk(s, m, t)) return 'invalid';
  const v = via ?? viaFor(s, m, t);
  if (via?.length && withTarget(m, t, via, () => bendWhy(s, m, via))) return 'invalid';
  if (s.crossings && laneBlocker(s, m, t, undefined, v)) return 'belt blocked';
  return '';
}

/** Run `fn` as if machine `m`'s belt went to `t` through `via`. */
function withTarget<T>(m: Machine, t: Target, via: Point[], fn: () => T): T {
  const old = m.out;
  m.out = { to: t, via, length: old?.length ?? 1, items: old?.items ?? [] };
  try {
    return fn();
  } finally {
    m.out = old;
  }
}

/** The posts machine `m`'s belt keeps if re-linked to `t`: its own, if they still fit, else none. */
export function viaFor(s: State, m: Machine, t: Target): Point[] {
  const via = m.out?.via;
  if (!via?.length) return [];
  return withTarget(m, t, via, () => bendWhy(s, m, via)) ? [] : via;
}

/** The target matrix alone (free dock, free input, no loop), ignoring lanes and posts. */
export const matrixOnlyOk = (s: State, m: Machine, t: Target) => matrixOk(s, m, t);

function matrixOk(s: State, m: Machine, t: Target): boolean {
  if (t.kind === 'dock') return t.index >= 0 && t.index < s.docks && !dockUsed(s, t.index, m);
  const tm = byId(s, t.id);
  if (!tm || tm.kind !== t.kind || tm.id === m.id) return false;
  if (m.kind === 'smelter' && tm.kind === 'smelter') return false;
  // Factories take smelters and drill junctions, and feed only docks and drills.
  if (tm.kind === 'factory' && (m.kind === 'factory' || (m.kind === 'drill' && !isJunction(s, m))))
    return false;
  if (m.kind === 'factory' && tm.kind !== 'drill') return false;
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
    // With crossings on, a dock the belt reaches without touching another belt comes first.
    const d = Math.hypot(q.x - p.x, q.y - p.y) + (s.crossings ? platesIf(s, m, t) * 1e4 : 0);
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

const RELINK_ORDER: Record<Machine['kind'], number> = { smelter: 0, factory: 1, drill: 2 };

/** Unlinked machines retry a free dock (never a machine): smelters, factories, then drills. */
function relinkAll(s: State) {
  const waiting = s.machines
    .filter((m) => !m.out)
    .sort((a, b) => RELINK_ORDER[a.kind] - RELINK_ORDER[b.kind] || a.id - b.id);
  for (const m of waiting) autoLink(s, m);
}

/** Recompute belt lengths after a change; items keep their relative place. */
export function relayout(s: State) {
  for (const m of s.machines) {
    if (!m.out) continue;
    const next = beltLength(s, m);
    if (Math.abs(next - m.out.length) < 1e-6) continue;
    const k = next / m.out.length;
    // Items keep their order and relative place, clamped onto the belt (never behind its start).
    // A shortened belt may bunch them up; they spread out again as the front moves.
    let max = next;
    for (const it of m.out.items) {
      it.pos = Math.max(0, Math.min(max, it.pos * k));
      max = it.pos;
    }
    m.out.length = next;
  }
}

// ---------------------------------------------------------------- lanes

/** Belts run beside machines, never under them: a belt's centre line keeps this far away. */
export const laneClear = (kind: Machine['kind']) =>
  kind === 'drill' ? DRILL_RADIUS : SMELTER_RADIUS;

function segDist(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

/** Does any piece of a polyline pass within `r` of `c`? */
function pathNear(pts: Point[], c: Point, r: number) {
  for (let i = 1; i < pts.length; i++) if (segDist(c, pts[i - 1], pts[i]) < r) return true;
  return false;
}

/** The machine a belt from `m` (at `from`, through `via`) to `t` would pass under, if any. */
function laneBlocker(
  s: State,
  m: Machine,
  t: Target,
  from = machinePos(m),
  via: Point[] = []
): Machine | null {
  const q = targetPos(s, t);
  if (!q) return null;
  const path = pathBetween(m, from, via, q, t.kind);
  for (const x of s.machines) {
    if (x.id === m.id || (t.kind !== 'dock' && x.id === t.id)) continue;
    if (pathNear(path, machinePos(x), laneClear(x.kind))) return x;
  }
  return null;
}

/**
 * Would a machine of this kind at `p` sit on a belt? Belts it owns or that end at it don't count
 * (`except`), nor the belt it is being spliced into (`splice`).
 */
function sitsOnBelt(
  s: State,
  kind: Machine['kind'],
  p: Point,
  except?: number,
  splice?: number | null
) {
  for (const m of s.machines) {
    if (!m.out || m.id === except || m.id === splice) continue;
    if (m.out.to.kind !== 'dock' && m.out.to.id === except) continue;
    const path = beltPath(s, m);
    if (path && pathNear(path, p, laneClear(kind))) return true;
  }
  return false;
}

/** With machine `m` moved to `place`, does any of its belts (out or in) pass under a machine? */
function lanesBlockedAt(
  s: State,
  m: Machine,
  place: { slot: number; angle: number } | Point
): boolean {
  const saved = m.kind === 'drill' ? { slot: m.slot, angle: m.angle } : { x: m.x, y: m.y };
  Object.assign(m, place);
  try {
    if (m.out && (laneBlocker(s, m, m.out.to, undefined, m.out.via) || shapeWhy(s, m, m.out.via)))
      return true;
    return inputsOf(s, m.id).some(
      (x) => laneBlocker(s, x, x.out!.to, undefined, x.out!.via) || shapeWhy(s, x, x.out!.via)
    );
  } finally {
    Object.assign(m, saved);
  }
}

// ---------------------------------------------------------------- crossings

/** A run of plates along one belt that a bundle enters together (all or nothing). */
export interface Gate {
  lo: number;
  hi: number;
  plates: { plate: Plate; mine: PlateSide; other: PlateSide }[];
}

export interface Crossings {
  plates: Plate[];
  /** Gates per belt (by owner id), in order along the belt. */
  gates: Map<number, Gate[]>;
  /** Presentation only: smoothed share of recent ticks a bundle waited at each plate (by key). */
  heat: Map<string, number>;
}

/** A belt as straight segments for plate finding: one per piece between bend posts. */
function segmentsOf(s: State, m: Machine): Segment[] {
  const path = beltPath(s, m);
  const to = m.out && targetPos(s, m.out.to);
  if (!path || !to) return [];
  const t = m.out!.to;
  const post = (k: number) => -1000 - m.id * (MAX_POSTS + 1) - k;
  const out: Segment[] = [];
  let off = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    const first = i === 1,
      last = i === path.length - 1;
    out.push({
      id: m.id,
      piece: i - 1,
      off,
      a,
      b,
      from: first ? machinePos(m) : a,
      to: last ? to : b,
      src: first ? m.id : post(i - 2),
      dst: last ? (t.kind === 'dock' ? -1 - t.index : t.id) : post(i - 1),
    });
    off += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return out;
}

function gatesOf(plates: Plate[]): Map<number, Gate[]> {
  const sides = new Map<number, Gate['plates']>();
  for (const plate of plates) {
    for (const k of [0, 1] as const) {
      const mine = plate.sides[k];
      const list = sides.get(mine.id) ?? [];
      list.push({ plate, mine, other: plate.sides[1 - k] });
      sides.set(mine.id, list);
    }
  }
  const gates = new Map<number, Gate[]>();
  for (const [id, list] of sides) {
    list.sort((a, b) => a.mine.lo - b.mine.lo || a.plate.key.localeCompare(b.plate.key));
    const out: Gate[] = [];
    for (const p of list) {
      const g = out[out.length - 1];
      // Plates closer than a spacing are one gate, so a bundle never stops inside a plate.
      if (g && p.mine.lo < g.hi + BELT_SPACING) {
        g.hi = Math.max(g.hi, p.mine.hi);
        g.plates.push(p);
      } else out.push({ lo: p.mine.lo, hi: p.mine.hi, plates: [p] });
    }
    gates.set(id, out);
  }
  return gates;
}

const NO_CROSSINGS: Crossings = { plates: [], gates: new Map(), heat: new Map() };
const crossingCache = new WeakMap<State, Crossings & { sig: string }>();

/** The factory's crossing plates, derived from belt geometry (cached until a belt moves). */
export function crossingsOf(s: State): Crossings {
  if (!s.crossings) return NO_CROSSINGS;
  const segs: Segment[] = [];
  for (const m of s.machines) segs.push(...segmentsOf(s, m));
  const sig = segs.map((g) => `${g.id}:${g.dst}:${g.a.x},${g.a.y},${g.b.x},${g.b.y}`).join(';');
  const hit = crossingCache.get(s);
  if (hit && hit.sig === sig) return hit;
  const plates = findPlates(segs);
  const next = { sig, plates, gates: gatesOf(plates), heat: hit?.heat ?? new Map() };
  crossingCache.set(s, next);
  return next;
}

/** How many plates machine `m`'s belt would have if it went to `t` (for auto-link). */
function platesIf(s: State, m: Machine, t: Target): number {
  const old = m.out;
  m.out = { to: t, length: 1, items: [] };
  const mine = segmentsOf(s, m);
  m.out = old;
  if (!mine.length) return 0;
  const segs = [...mine];
  for (const x of s.machines) if (x !== m) segs.push(...segmentsOf(s, x));
  return findPlates(segs).filter((p) => p.sides.some((q) => q.id === m.id)).length;
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

/** Closest a drill and a smelter centre may be. */
const DRILL_SMELTER_GAP = SMELTER_RADIUS + DRILL_RADIUS * 0.7;

/**
 * Why a drill (or drill `except`, being moved) can't sit at this rim angle, or '' when it can.
 * Drills go anywhere on an unlocked rock's rim, clear of other machines: the rim's length, not a
 * socket count, decides how many fit.
 */
export function drillSpotWhy(
  s: State,
  slot: number,
  angle: number,
  except?: number,
  lanes = true
): string {
  if (!s.slots[slot]?.unlocked) return 'locked';
  if (!Number.isFinite(angle)) return 'no room here';
  const p = rimPos(slot, angle);
  for (const m of s.machines) {
    if (m.id === except) continue;
    const q = machinePos(m);
    const min = m.kind === 'drill' ? DRILL_SPACING : DRILL_SMELTER_GAP;
    if (Math.hypot(p.x - q.x, p.y - q.y) < min) return 'no room here';
  }
  if (lanes && s.crossings) {
    if (sitsOnBelt(s, 'drill', p, except)) return 'on a belt';
    const m = except === undefined ? undefined : byId(s, except);
    if (m && lanesBlockedAt(s, m, { slot, angle: normAngle(angle) })) return 'belt blocked';
  }
  return '';
}

export interface RimSpot {
  slot: number;
  angle: number;
  /** '' when a drill can go here; otherwise the reason it can't. */
  why: string;
}

/**
 * The rim spot for a drill dropped at `p`: the nearest unlocked rim within `maxDist`, slid along
 * the rim by at most one drill spacing to clear its neighbours. The player picks the spot on the
 * rock; the game only finds the footing. With no legal spot near, it names the nearest refusal.
 */
export function nearestRim(s: State, p: Point, maxDist: number, except?: number): RimSpot | null {
  // Only the rock whose rim is nearest the finger: a refused spot names its reason rather than
  // jumping the ghost to a neighbouring rock (which would mine different ore).
  let slot = -1,
    off = maxDist;
  SLOTS.forEach((def, i) => {
    if (!s.slots[i].unlocked) return;
    const d = Math.abs(Math.hypot(p.x - def.x, p.y - def.y) - rimRadius(i));
    if (d <= off) [slot, off] = [i, d];
  });
  if (slot < 0) return null;
  const def = SLOTS[slot];
  const R = rimRadius(slot);
  const a0 = normAngle(Math.atan2(p.y - def.y, p.x - def.x));
  const step = 2 / R;
  const reach = DRILL_SPACING / R;
  let refused: RimSpot | null = null;
  for (let d = 0; d <= reach; d += step) {
    for (const dir of d ? [1, -1] : [1]) {
      const a = normAngle(a0 + dir * d);
      const why = drillSpotWhy(s, slot, a, except);
      // Sliding outward, the first legal spot is the nearest one.
      if (!why) return { slot, angle: a, why };
      if (d === 0) refused = { slot, angle: a, why };
    }
  }
  return refused;
}

export function smelterSpotOk(
  s: State,
  p: Point,
  except?: number,
  splice?: number | null,
  lanes = true
): boolean {
  return smelterSpotWhy(s, p, except, splice, lanes) === '';
}

/**
 * Why a smelter (or smelter `except`, being moved) can't stand at `p`, or ''. Dropped into a
 * line, it may sit on that belt (`splice`), but never on another one.
 */
export function smelterSpotWhy(
  s: State,
  p: Point,
  except?: number,
  splice?: number | null,
  lanes = true
): string {
  const no = 'no room here';
  if (Math.hypot(p.x, p.y) < DOCK_RADIUS + SMELTER_RADIUS + 6) return no;
  if (p.x < -330 || p.x > 330 || p.y > 110 || p.y < -1150) return no;
  for (let i = 0; i < SLOTS.length; i++) {
    const d = SLOTS[i];
    // Hidden rocks too: a smelter never sits where a rock will be unlocked.
    if (Math.hypot(p.x - d.x, p.y - d.y) < d.r * CELL + SMELTER_RADIUS + 2) return no;
  }
  for (const m of s.machines) {
    if (m.id === except) continue;
    const q = machinePos(m);
    const min = m.kind !== 'drill' ? SMELTER_RADIUS * 2 + 8 : DRILL_SMELTER_GAP;
    if (Math.hypot(p.x - q.x, p.y - q.y) < min) return no;
  }
  if (lanes && s.crossings) {
    if (sitsOnBelt(s, 'smelter', p, except, splice)) return 'on a belt';
    const m = except === undefined ? undefined : byId(s, except);
    if (m && lanesBlockedAt(s, m, { x: p.x, y: p.y })) return 'belt blocked';
  }
  return '';
}

// ---------------------------------------------------------------- bend posts

function setVia(b: Belt, via: Point[]) {
  if (via.length) b.via = via.map((p) => ({ x: p.x, y: p.y }));
  else delete b.via;
}

/** Most bend posts one belt may have (docs/ROCKHOPPER_BEND_POSTS.md, P1). */
export const MAX_POSTS = 2;
/** A post's footprint, for keeping it off rocks, machines and the hub. */
export const POST_RADIUS = 6;
/** Sharpest turn a belt may make at a post: 120°, so it never folds back on itself. */
const MIN_TURN_DOT = Math.cos((120 * Math.PI) / 180);
/** A bent belt's pieces keep this far from the hub's centre (its body plus a margin). */
const HUB_CLEAR = HUB_RADIUS + 4;

function segSegDist(a: Point, b: Point, c: Point, d: Point): number {
  const cross = (o: Point, p: Point, q: Point) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(a, b, c),
    d2 = cross(a, b, d),
    d3 = cross(c, d, a),
    d4 = cross(c, d, b);
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
}

/** Why a bend post can't stand at `p` (ignoring the belt it bends), or ''. */
export function postSpotWhy(s: State, p: Point): string {
  const no = 'no room here';
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return no;
  if (Math.hypot(p.x, p.y) < DOCK_RADIUS + POST_RADIUS + 4) return no;
  if (p.x < -330 || p.x > 330 || p.y > 110 || p.y < -1150) return no;
  for (let i = 0; i < SLOTS.length; i++) {
    const d = SLOTS[i];
    if (Math.hypot(p.x - d.x, p.y - d.y) < d.r * CELL + POST_RADIUS + 2) return no;
  }
  for (const m of s.machines) {
    const q = machinePos(m);
    if (Math.hypot(p.x - q.x, p.y - q.y) < laneClear(m.kind) + POST_RADIUS) return no;
  }
  return '';
}

/**
 * Why machine `m`'s belt can't bend through `via` (P1, P3), or ''. Lanes are checked separately
 * (they apply only with crossings on).
 */
export function bendWhy(s: State, m: Machine, via: Point[] | undefined): string {
  if (!via?.length) return '';
  if (!m.out || via.length > MAX_POSTS) return 'invalid';
  for (const p of via) {
    const why = postSpotWhy(s, p);
    if (why) return why;
  }
  return shapeWhy(s, m, via);
}

/**
 * The shape rules alone (P3): every piece long enough, no turn sharper than 120°, clear of the
 * hub, and never across itself. Moves check these; post spots only matter where posts are set.
 */
function shapeWhy(s: State, m: Machine, via: Point[] | undefined): string {
  if (!via?.length || !m.out) return '';
  const q = targetPos(s, m.out.to);
  if (!q) return 'invalid';
  const path = pathBetween(m, machinePos(m), via, q, m.out.to.kind);
  const hub = { x: 0, y: 0 };
  for (let i = 1; i < path.length; i++)
    if (segDist(hub, path[i - 1], path[i]) < HUB_CLEAR) return 'over the hub';
  if (path.length === 4 && segSegDist(path[0], path[1], path[2], path[3]) < CROSS_TOUCH)
    return 'crosses itself';
  for (let i = 1; i < path.length; i++)
    if (Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) < MIN_FEED)
      return 'too short';
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1],
      b = path[i],
      c = path[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y) || 1,
      l2 = Math.hypot(c.x - b.x, c.y - b.y) || 1;
    const dot = ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (l1 * l2);
    if (dot < MIN_TURN_DOT) return 'too sharp';
  }
  return '';
}

/** Why machine `m`'s belt can't bend through `via`, lanes included, or ''. */
export function bendRefusalWhy(s: State, m: Machine, via: Point[]): string {
  return (
    bendWhy(s, m, via) ||
    (s.crossings && via.length && m.out && laneBlocker(s, m, m.out.to, undefined, via)
      ? 'belt blocked'
      : '')
  );
}

/** Set machine `id`'s bend posts (an empty list straightens its belt). */
export function bend(s: State, id: number, via: Point[]): Result {
  const m = byId(s, id);
  if (!m?.out) return 'missing';
  if (!Array.isArray(via)) return 'invalid';
  const v = via.map((p) => ({ x: Number(p?.x), y: Number(p?.y) }));
  const why = bendRefusalWhy(s, m, v);
  if (why) return why;
  if (v.length) m.out.via = v;
  else delete m.out.via;
  relayout(s);
  s.events.push({ type: 'route', id });
  return true;
}

/** The simulation's own splice check: generous, since the UI snaps within screen tolerances. */
export const SPLICE_REACH = 40;
/** Shortest belt a splice may leave between the owner and the smelter. */
export const MIN_FEED = BELT_SPACING + 4;

/** Machines that are placed freely and can be dropped into a line. */
export type Placed = Smelter | Factory;

/**
 * Can `sm` (or a new machine of `kind`, `sm` null) be put into `owner`'s belt near `p`? A smelter
 * goes after a drill and before anything but a smelter; a factory goes after a smelter or a drill
 * junction and before a dock or a drill. No loop.
 */
export function canSplice(
  s: State,
  owner: Machine | undefined,
  sm: Placed | null,
  p: Point,
  anywhere = false,
  kind: Placed['kind'] = sm?.kind ?? 'smelter'
) {
  if (!owner?.out) return false;
  const old = owner.out.to;
  if (kind === 'smelter') {
    if (owner.kind !== 'drill' || old.kind === 'smelter') return false;
  } else {
    if (owner.kind === 'factory' || (owner.kind === 'drill' && !isJunction(s, owner))) return false;
    if (old.kind !== 'dock' && old.kind !== 'drill') return false;
  }
  const b = beltDistance(s, owner, p);
  if (!b || b.d > SPLICE_REACH) return false;
  // The owner's shortened belt must still hold a bundle and its spacing.
  const feed = b.along - SMELTER_RADIUS * 0.8;
  if (!anywhere && feed < MIN_FEED) return false;
  if (sm) {
    if (sm.out || owner.id === sm.id) return false;
    if (inputsOf(s, sm.id).length >= inputCap(sm)) return false;
    if (reaches(s, old, sm.id)) return false;
  }
  // A smelter may sit exactly on one of the belt's bend posts (its knee), never half on one.
  const knee = kneeAt(owner, p);
  if (
    knee < 0 &&
    (owner.out.via ?? []).some(
      (v) => Math.hypot(v.x - p.x, v.y - p.y) < SMELTER_RADIUS + POST_RADIUS
    )
  )
    return false;
  if (s.crossings && spliceLanesBlocked(s, owner, sm, p)) return false;
  return true;
}

/** Would either belt a splice at `p` leaves (owner → smelter, smelter → old target) pass under a machine? */
export function spliceLanesBlocked(s: State, owner: Machine, sm: Placed | null, p: Point) {
  const old = owner.out!.to;
  const q = targetPos(s, old);
  if (!q) return false;
  const [feedVia, onVia] = splitVia(s, owner, p);
  const lanes = [
    pathBetween(owner, machinePos(owner), feedVia, p, 'smelter'),
    pathBetween({ kind: 'smelter' } as Machine, p, onVia, q, old.kind),
  ];
  for (const x of s.machines) {
    if (x.id === owner.id || x.id === sm?.id || (old.kind !== 'dock' && x.id === old.id)) continue;
    const c = machinePos(x);
    if (lanes.some((path) => pathNear(path, c, laneClear(x.kind)))) return true;
  }
  return false;
}

/** How close to a bend post a splice snaps onto it (the knee). */
export const KNEE_SNAP = SMELTER_RADIUS + POST_RADIUS;

/** The index of the bend post of `owner`'s belt that `p` sits on, or -1. */
export function kneeAt(owner: Machine, p: Point): number {
  return (owner.out?.via ?? []).findIndex((v) => Math.hypot(v.x - p.x, v.y - p.y) < 0.5);
}

/** The bend post of `owner`'s belt within `reach` of `p` (nearest first), or null. */
export function kneeNear(owner: Machine, p: Point, reach = KNEE_SNAP): Point | null {
  let best: Point | null = null,
    bd = reach;
  for (const v of owner.out?.via ?? []) {
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d < bd) {
      bd = d;
      best = { x: v.x, y: v.y };
    }
  }
  return best;
}

/**
 * A splice at `p` splits `owner`'s bend posts: those before it stay, the rest go onward. A
 * splice on a post (its knee) uses that post up: the smelter stands where the belt turned.
 */
function splitVia(s: State, owner: Machine, p: Point): [Point[], Point[]] {
  const via = owner.out?.via ?? [];
  if (!via.length) return [[], []];
  const j = kneeAt(owner, p);
  if (j >= 0) return [via.slice(0, j), via.slice(j + 1)];
  const k = beltDistance(s, owner, p)?.piece ?? 0;
  return [via.slice(0, k), via.slice(k)];
}

function pay(s: State, cost: number): boolean {
  if (s.credits < cost) return false;
  s.credits -= cost;
  return true;
}

const base = () => ({
  tier: 1,
  tierBought: 0,
  rr: 0,
  fullT: 0,
  full: false,
  cd: 0,
  wait: 0,
  heldAgo: HELD_WINDOW,
  crossT: 0,
  cross: false,
});

export function buildDrill(s: State, slot: number, angle: number): Result {
  const why = drillSpotWhy(s, slot, angle);
  if (why) return why;
  const cost = drillPriceOn(s, slot);
  if (!pay(s, cost)) return 'credits';
  const d: Drill = {
    id: s.nextId++,
    kind: 'drill',
    level: 1,
    spent: cost,
    out: null,
    ...base(),
    slot,
    angle: normAngle(angle),
    buffer: [],
    cell: -1,
  };
  s.machines.push(d);
  autoLink(s, d);
  s.events.push({ type: 'build', id: d.id });
  return true;
}

/** Put `sm` into `owner`'s line: owner → it → owner's old target. Its belt starts at tier 1. */
function spliceInto(s: State, sm: Placed, owner: Machine) {
  const old = owner.out!.to;
  const [feedVia, onVia] = splitVia(s, owner, machinePos(sm));
  sm.out = { to: old, length: 1, items: [] };
  if (onVia.length) sm.out.via = onVia;
  owner.out!.to = { kind: sm.kind, id: sm.id } as Target;
  if (feedVia.length) owner.out!.via = feedVia;
  else delete owner.out!.via;
  relayout(s);
  s.events.push({ type: 'route', id: owner.id }, { type: 'route', id: sm.id });
}

/**
 * Place a smelter. With `splice` (a drill's id), it is dropped on that drill's belt and goes
 * into that line; otherwise it stands alone and takes a free dock if there is one.
 */
export function buildSmelter(s: State, p: Point, splice?: number | null): Result {
  if (!smelterSpotOk(s, p, undefined, splice)) return 'blocked';
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

/**
 * Place a factory. With `splice` (a smelter's or drill junction's id), it is dropped on that belt
 * and goes into that line; otherwise it stands alone and takes a free dock if there is one. Its
 * output starts at tier 1 whatever the belt it went into: tiers are only ever bought.
 */
export function buildFactory(s: State, p: Point, splice?: number | null): Result {
  if (!s.factories) return 'unavailable';
  if (!smelterSpotOk(s, p, undefined, splice)) return 'blocked';
  const owner = splice == null ? undefined : byId(s, splice);
  if (splice != null && !canSplice(s, owner, null, p, false, 'factory')) return 'invalid';
  const cost = priceOf(s, 'factory');
  if (!pay(s, cost)) return 'credits';
  const m: Factory = {
    id: s.nextId++,
    kind: 'factory',
    level: 1,
    spent: cost,
    out: null,
    ...base(),
    x: p.x,
    y: p.y,
    stock: [],
    pairs: [],
    job: null,
    ready: [],
    rawT: 0,
  };
  s.machines.push(m);
  if (owner) spliceInto(s, m, owner);
  else autoLink(s, m);
  s.events.push({ type: 'build', id: m.id });
  return true;
}

/**
 * Dropping `m`'s belt on busy dock `t`: the dock's belt takes `m`'s old place (its dock, or the
 * machine it fed), so a full hub never leaves a belt with nowhere to go. `via` is the posts `m`'s
 * new belt bends through (pinned while dragging), else the ones it keeps. Returns the machine
 * that moves and why not, in a few words, when it can't: 'belt blocked' (the dragged belt would
 * run under a machine), 'swap blocked' (the other belt would), or 'dock busy'.
 */
export function swapWhy(
  s: State,
  m: Machine,
  t: Target,
  via?: Point[]
): { partner: Machine | null; why: string } {
  const none = (why: string) => ({ partner: null, why });
  const from = m.out?.to;
  if (t.kind !== 'dock' || !from || sameTarget(from, t)) return none('invalid');
  if (t.index < 0 || t.index >= s.docks) return none('invalid');
  const o = s.machines.find(
    (x) => x !== m && x.out?.to.kind === 'dock' && x.out.to.index === t.index
  );
  if (!o) return none('invalid');
  if (from.kind !== 'dock' && from.id === o.id) return none('dock busy');
  const vm = via ?? viaFor(s, m, t);
  if (via?.length && withTarget(m, t, via, () => bendWhy(s, m, via))) return none('invalid');
  // As if `m` had moved: then `o` may take `m`'s old target if the matrix allows it.
  const ok = withTarget(m, t, vm, () => matrixOk(s, o, from));
  if (!ok) return none('dock busy');
  if (s.crossings) {
    if (laneBlocker(s, m, t, undefined, vm)) return none('belt blocked');
    const vo = withTarget(m, t, vm, () => viaFor(s, o, from));
    if (withTarget(m, t, vm, () => laneBlocker(s, o, from, undefined, vo)))
      return none('swap blocked');
  }
  return { partner: o, why: '' };
}

/** The machine `m` trades places with when dropped on busy dock `t`, or null (`swapWhy`). */
export function swapPartner(s: State, m: Machine, t: Target, via?: Point[]): Machine | null {
  return swapWhy(s, m, t, via).partner;
}

/**
 * Link machine `id` to `to`. With `via`, the new belt bends through those posts (pinned while
 * dragging the link); without, it keeps its posts if they still suit the new target.
 */
export function route(s: State, id: number, to: Target, via?: Point[]): Result {
  const m = byId(s, id);
  if (!m) return 'missing';
  const pinned = Array.isArray(via)
    ? via.map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
    : undefined;
  if (pinned && pinned.length > MAX_POSTS) return 'invalid';
  if (m.out && sameTarget(m.out.to, to)) return pinned ? bend(s, id, pinned) : true;
  const keep = pinned ?? viaFor(s, m, to);
  if (!canTarget(s, m, to, keep)) {
    // Dropped on a busy dock: that dock's belt takes this one's old place, each keeping posts
    // that still fit (the dragged belt takes its pinned posts).
    const o = swapPartner(s, m, to, pinned);
    if (!o) return pinned?.length ? targetWhy(s, m, to, keep) || 'invalid' : 'invalid';
    const from = m.out!.to;
    const vm = keep;
    const vo = withTarget(m, to, vm, () => viaFor(s, o, from));
    o.out!.to = from;
    m.out!.to = to;
    setVia(o.out!, vo);
    setVia(m.out!, vm);
    relayout(s);
    s.events.push({ type: 'route', id: o.id }, { type: 'route', id });
    return true;
  }
  if (m.out) {
    m.out.to = to;
    setVia(m.out, keep);
  } else {
    m.out = { to, length: 1, items: [] };
    setVia(m.out, keep);
  }
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
      : m.kind === 'factory'
        ? m.stock.length + 2 * m.pairs.length + (m.job ? 2 : 0) + m.ready.length
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
      delete heir.out!.via;
      s.events.push({ type: 'route', id: heir.id });
    } else unlink(heir);
    for (const x of rest) {
      const t: Target = { kind: heir.kind, id: heir.id } as Target;
      if (heir.out && canTarget(s, x, t)) {
        x.out!.to = t;
        delete x.out!.via;
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

export function moveDrill(s: State, id: number, slot: number, angle: number): Result {
  const m = byId(s, id);
  if (!m || m.kind !== 'drill') return 'missing';
  const why = drillSpotWhy(s, slot, angle, id);
  if (why) return why;
  const cost = moveDrillCost(s, id, slot);
  if (cost > 0) {
    if (!pay(s, cost)) return 'credits';
    m.spent += cost;
  }
  m.slot = slot;
  m.angle = normAngle(angle);
  m.cell = -1;
  relayout(s);
  s.events.push({ type: 'move', id });
  return true;
}

/**
 * Move a smelter or a factory; its links stretch along. One with no output may be dropped on a
 * belt.
 */
export function moveSmelter(s: State, id: number, p: Point, splice?: number | null): Result {
  const m = byId(s, id);
  if (!m || m.kind === 'drill') return 'missing';
  if (!smelterSpotOk(s, p, id, splice)) return 'blocked';
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
  const def = SLOTS[slot];
  return s.slowRocks ? Math.round(def.price * SLOW_PRICE[def.tier]) : def.price;
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

/** Switch the factories experiment. Off hides the tray item; existing factories keep working. */
export function setFactories(s: State, on: boolean): Result {
  s.factories = !!on;
  return true;
}

/** Switch the drill-prices experiment: by rock tier, or classic 14 × 1.55^n with free moves. */
export function setRockPrices(s: State, on: boolean): Result {
  s.rockPrices = !!on;
  return true;
}

/**
 * Switch the crossings experiment (plates and clear lanes). Turning it on keeps every existing
 * link, even one that runs under a machine: only new links and moves must keep lanes clear.
 */
export function setCrossings(s: State, on: boolean): Result {
  s.crossings = !!on;
  s.crossingsNotice = undefined;
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
  // A deep cell gives up one layer per break (a crumble takes all it has left) and stays until
  // its last layer goes.
  let chunks = 1;
  if (rock.layers) {
    const before = rock.layers[index];
    chunks = by === 'crumble' ? before : 1;
    rock.layers[index] = before - chunks;
    rock.layersLeft! -= chunks;
    if (shadeBand(before, rock.depth!) !== shadeBand(rock.layers[index], rock.depth!))
      rock.bands!++;
  }
  rock.work[index] = 0;
  if (!rock.layers || rock.layers[index] === 0) {
    rock.cells[index] = 0;
    rock.remaining--;
  }
  s.events.push({
    type: 'break',
    slot: slotIndex,
    cell: index,
    ore,
    x: p.x,
    y: p.y,
    by,
    ...(chunks > 1 ? { chunks } : {}),
  });
  if (by === 'laser') s.stats.laserBroken++;
  else if (by === 'drill') s.stats.drillBroken++;
  else s.stats.crumbleBroken++;
  if (by !== 'drill') {
    const dist = Math.hypot(p.x, p.y);
    const secs = Math.min(FLIGHT_MAX, Math.max(FLIGHT_MIN, dist / FLIGHT_SPEED));
    // A crumbling deep cell flies home in flights of at most CRUMBLE_FLIGHT_MAX chunks.
    for (let left = chunks; left > 0; left -= CRUMBLE_FLIGHT_MAX)
      s.flights.push({
        ore,
        value: ORES[ore].value * Math.min(left, CRUMBLE_FLIGHT_MAX),
        x: p.x,
        y: p.y,
        t0: s.tick,
        t1: s.tick + Math.round(secs * TICK_HZ),
      });
  }
  const low = rock.layers
    ? rock.layersLeft! < rock.layersTotal! * DEEP_CRUMBLE_AT
    : rock.remaining < rock.total * CRUMBLE_AT;
  if (!slot.crumble && rock.remaining > 0 && low) {
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
        slot.rock = generateRock(i, slot.gen, s.seed, rockDepth(s, i, slot.gen));
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
      const wait = s.slowRocks ? AUTO_TOW_SECONDS : arrivalSeconds(s.tractorLevel);
      slot.arriveAt = s.tick + Math.round(wait * TICK_HZ);
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
        d.cell = nearestCell(d.slot, rock, rimPos(d.slot, d.angle));
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

/** Take the front item off a belt, keeping its value class (multiplier, and alloy pair). */
function takeFront(b: Belt): Bar {
  const f = b.items[0];
  const ore = f.ores.shift()!;
  if (!f.ores.length) b.items.shift();
  return classOf(ore, f);
}

function classOf(ore: Ore, c: { mult: number; alloy?: Ore; v?: number }): Bar {
  const bar: Bar = { ore, mult: c.mult };
  if (c.alloy !== undefined) bar.alloy = c.alloy;
  if (c.v !== undefined) bar.v = c.v;
  return bar;
}

/** Items share a bundle only with the same value class: multiplier, alloy pair and value. */
export const sameClass = (
  a: { mult: number; alloy?: Ore; v?: number },
  b: { mult: number; alloy?: Ore; v?: number }
) => a.mult === b.mult && a.alloy === b.alloy && a.v === b.v;

/** The credits one item of a bundle (or a bar) is worth. */
export const itemValue = (ore: Ore, c: { mult: number; v?: number }) =>
  c.v ?? ORES[ore].value * c.mult;

/**
 * Load each belt that has room at its start. A drill loads as a fair zipper: one chunk at a
 * time, round-robin over its own buffer and each input belt with an item waiting, until the
 * bundle holds the belt's tier. A smelter loads its finished and passing bars. A bundle never
 * mixes values.
 */
/** Ticks between loads: a bundle every full spacing of travel (7.5 bundles a second). */
const LOAD_TICKS = Math.ceil(BELT_SPACING / (BELT_SPEED * DT));

function loadBelts(s: State) {
  for (const m of s.machines) {
    const b = m.out;
    if (!b) continue;
    if (m.cd > 0) {
      m.cd--;
      continue;
    }
    const last = b.items[b.items.length - 1];
    if (last && last.pos < BELT_SPACING) continue;
    const ores: Ore[] = [];
    let cls: Bar | null = null;
    if (m.kind !== 'drill') {
      while (m.ready.length && ores.length < m.tier && (!cls || sameClass(m.ready[0], cls))) {
        const bar = m.ready.shift()!;
        cls = bar;
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
            if (!m.buffer.length || (cls && !sameClass(cls, { mult: 1 }))) continue;
            ores.push(m.buffer.shift()!);
            cls = { ore: ores[0], mult: 1 };
          } else {
            const belt = inputs[idx - 1].out!;
            const f = waiting(belt);
            if (!f || (cls && !sameClass(f, cls))) continue;
            const item = takeFront(belt);
            cls = item;
            ores.push(item.ore);
          }
          m.rr = (idx + 1) % n;
          took = true;
          break;
        }
        if (!took) break;
      }
    }
    if (ores.length && cls) {
      const it: BeltItem = { pos: 0, ores, mult: cls.mult };
      if (cls.alloy !== undefined) it.alloy = cls.alloy;
      if (cls.v !== undefined) it.v = cls.v;
      b.items.push(it);
      m.cd = LOAD_TICKS - 1;
    }
    // Saturation sample at each load chance: the bundle left full and items still wait.
    const left =
      m.kind !== 'drill'
        ? m.ready.length > 0
        : m.buffer.length > 0 || inputsOf(s, m.id).some((x) => waiting(x.out));
    // A belt whose front keeps waiting at a downstream machine is limited further down.
    const held = m.heldAgo < HELD_WINDOW;
    sample(m, ores.length >= m.tier && left && !held, FULL_LOAD_ALPHA);
  }
}

/** Smoothing per load chance (about half a second) and per tick for jams. */
const FULL_LOAD_ALPHA = 0.2;
const JAM_TICK_ALPHA = DT / 0.6;

/** Exponential smoothing with hysteresis: on above 0.5, off below 0.2. */
function smooth(t: number, flag: boolean, on: boolean, alpha: number): [number, boolean] {
  const next = t + ((on ? 1 : 0) - t) * alpha;
  return [next, next >= 0.5 ? true : next <= 0.2 ? false : flag];
}

function sample(m: Machine, on: boolean, alpha: number) {
  [m.fullT, m.full] = smooth(m.fullT, m.full, on, alpha);
}

/**
 * Crossings: who may enter a gate this tick. A bundle enters only with room to get all the way
 * out on its own belt, and only if no bundle of the other belt is moving through the plate. The
 * longest-waiting request claims its plates first (then the lower belt id); a claim holds even
 * when that request is still refused, so a stream of bundles can't starve the other belt. The
 * oldest request is only ever held by bundles already inside, which always get out, so nothing
 * deadlocks. Bundles that can't move (backed up from a machine) don't hold a plate. Returns the
 * bundles that must stop at a gate, with where.
 */
function arbitrate(s: State, x: Crossings, step: number): Map<BeltItem, number> {
  const stop = new Map<BeltItem, number>();
  const stuckOn = new Map<number, Set<BeltItem>>();
  const reqs: { id: number; it: BeltItem; gate: Gate }[] = [];
  for (const m of s.machines) {
    const b = m.out;
    const gates = x.gates.get(m.id);
    if (!b || !gates) {
      for (const it of b?.items ?? []) delete it.w;
      continue;
    }
    const items = b.items;
    const stuck = new Set<BeltItem>();
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      const ahead = items[k - 1];
      const blocked = ahead
        ? (stuck.has(ahead) || (ahead.w ?? 0) > 0) && ahead.pos - it.pos <= BELT_SPACING + 1e-6
        : b.to.kind !== 'dock' && it.pos >= b.length - 1e-6;
      if (blocked) stuck.add(it);
      // The bundle ahead may move first this tick, so only the step limits the reach here.
      const reach = Math.min(it.pos + step, b.length);
      const gate = gates.find((g) => g.lo >= it.pos - 1e-6 && g.lo < reach - 1e-6);
      if (!gate) {
        delete it.w;
        continue;
      }
      // Room to get out: the bundle ahead is clear of the exit, or still moving (it can only stop
      // at the next gate, at least a spacing past this one, or in a backlog that frees the plate).
      const aheadHeld = !!ahead && (stuck.has(ahead) || (ahead.w ?? 0) > 0);
      if (ahead && aheadHeld && ahead.pos < gate.hi + BELT_SPACING - 1e-6) {
        // No room to get out yet: an ordinary backlog, not a wait for the crossing. It is held,
        // so the bundles bunched behind it (maybe inside an earlier plate) don't hold that plate.
        delete it.w;
        stop.set(it, gate.lo);
        stuck.add(it);
        continue;
      }
      reqs.push({ id: m.id, it, gate });
    }
    stuckOn.set(m.id, stuck);
  }
  const moving = (q: PlateSide) =>
    (byId(s, q.id)?.out?.items ?? []).some(
      (it) => it.pos > q.lo + 1e-6 && it.pos < q.hi - 1e-6 && !stuckOn.get(q.id)?.has(it)
    );
  reqs.sort((a, b) => (b.it.w ?? 0) - (a.it.w ?? 0) || a.id - b.id || b.it.pos - a.it.pos);
  const claim = new Map<string, number>();
  for (const r of reqs) {
    let ok = true;
    for (const p of r.gate.plates) {
      const owner = claim.get(p.plate.key);
      if ((owner !== undefined && owner !== r.id) || moving(p.other)) ok = false;
    }
    for (const p of r.gate.plates) if (!claim.has(p.plate.key)) claim.set(p.plate.key, r.id);
    if (ok) delete r.it.w;
    else {
      r.it.w = (r.it.w ?? 0) + 1;
      stop.set(r.it, r.gate.lo);
    }
  }
  // Presentation and bubble signals: which plates and belts have bundles waiting their turn.
  const hot = new Set<string>();
  for (const r of reqs) if (r.it.w) for (const p of r.gate.plates) hot.add(p.plate.key);
  for (const p of x.plates) {
    const h = x.heat.get(p.key) ?? 0;
    x.heat.set(p.key, h + ((hot.has(p.key) ? 1 : 0) - h) * HEAT_ALPHA);
  }
  return stop;
}

/** Smoothing per tick for crossing signals (about a second). */
const HEAT_ALPHA = DT / 1;

function crossTick(s: State) {
  for (const m of s.machines) {
    const on = !!m.out?.items.some((it) => (it.w ?? 0) > 0);
    [m.crossT, m.cross] = smooth(m.crossT, m.cross, on, HEAT_ALPHA);
  }
}

function moveBelts(s: State) {
  const step = BELT_SPEED * DT;
  const x = crossingsOf(s);
  const stop = x.plates.length ? arbitrate(s, x, step) : null;
  if (!stop) for (const m of s.machines) for (const it of m.out?.items ?? []) delete it.w;
  for (const m of s.machines) {
    const b = m.out;
    if (!b) continue;
    let max = b.length;
    for (const it of b.items) {
      const at = stop?.get(it);
      const lim = at === undefined ? max : Math.min(max, at);
      // Never backwards: bunched items (after a splice or move) wait until there is room.
      it.pos = Math.max(it.pos, Math.min(it.pos + step, lim));
      max = it.pos - BELT_SPACING;
    }
    const front = b.items[0];
    if (front && b.to.kind === 'dock' && front.pos >= b.length - 1e-6) {
      b.items.shift();
      const p = dockPos(b.to.index);
      for (const ore of front.ores) {
        const value = itemValue(ore, front);
        earn(s, value);
        s.stats.delivered++;
        const e: SimEvent = {
          type: 'deliver',
          x: p.x,
          y: p.y,
          value,
          ore,
          bar: front.mult > 1,
          dock: b.to.index,
        };
        if (front.alloy !== undefined) e.alloy = front.alloy;
        s.events.push(e);
      }
    }
  }
}

/** Seconds a smelter holds an unpaired chunk with nothing arriving before smelting it alone. */
export const LONE_WAIT = 2;

function smeltersTick(s: State) {
  for (const sm of smelters(s)) {
    // Intake: as many chunks per tick as there is room for, one per input belt in turn.
    // Bars pass straight through to the output; raw chunks queue for pairing.
    const inputs = inputsOf(s, sm.id);
    const n = inputs.length;
    let took = true;
    let any = false;
    let refused = false;
    while (took && n) {
      took = false;
      for (let k = 0; k < n; k++) {
        const idx = (sm.rr + k) % n;
        const belt = inputs[idx].out!;
        const f = waiting(belt);
        if (!f) continue;
        if (f.mult > 1) {
          if (sm.ready.length >= SMELTER_READY) {
            refused = true;
            continue;
          }
          sm.ready.push(takeFront(belt));
        } else {
          if (sm.queue.length >= SMELTER_QUEUE) {
            refused = true;
            continue;
          }
          sm.queue.push(takeFront(belt).ore);
        }
        sm.rr = (idx + 1) % n;
        took = any = true;
        break;
      }
    }
    if (any) sm.idle = 0;
    else sm.idle++;
    // Blocked: the smelter itself is the limit (its output isn't backed up, its queue is full).
    [sm.jamT, sm.jam] = smooth(sm.jamT, sm.jam, refused && !sm.full, JAM_TICK_ALPHA);
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

/**
 * How long each belt's front has waited at a downstream machine. A machine whose belt is held
 * up downstream is not itself "full": the limit is further down the line, so it decays.
 */
// ---------------------------------------------------------------- factories

/** A bar a factory pairs: a paired bar (×6) of an ore other than rock, not an alloy. */
export const pairable = (b: Bar) =>
  b.mult === BAR_VALUE && b.alloy === undefined && b.v === undefined && b.ore !== ROCK;

const premium = (a: Ore, b: Ore) =>
  (a === COPPER && b === CRYSTAL) || (a === CRYSTAL && b === COPPER);

/** The alloy two bars make: the lower ore and the higher one, worth 1.25× (or 2.5×) both bars. */
export function alloyOf([a, b]: [Bar, Bar]): Bar {
  const mult = premium(a.ore, b.ore) ? PREMIUM_MULT : ALLOY_MULT;
  const v = Math.floor(mult * (itemValue(a.ore, a) + itemValue(b.ore, b)));
  return {
    ore: Math.min(a.ore, b.ore) as Ore,
    mult: BAR_VALUE,
    alloy: Math.max(a.ore, b.ore) as Ore,
    v,
  };
}

const reserved = (o: Ore) => o === COPPER || o === CRYSTAL;

/**
 * The waiting bar `bar` pairs with. Copper and crystal are reserved for each other; the other
 * ores pair among themselves. `any` (a bar that has waited out `LONE_WAIT`) takes any other ore.
 */
function partnerIndex(stock: Bar[], bar: Bar, any = false): number {
  if (any) return stock.findIndex((x) => x.ore !== bar.ore);
  if (reserved(bar.ore)) return stock.findIndex((x) => reserved(x.ore) && x.ore !== bar.ore);
  return stock.findIndex((x) => !reserved(x.ore) && x.ore !== bar.ore);
}

/** Take stock bar `k` out, without its arrival tick. */
function unstock(f: Factory, k: number): Bar {
  const { t: _t, ...bar } = f.stock.splice(k, 1)[0];
  return bar;
}

/** Where an arriving item would go: 'pair', 'stock', 'pass', or null when there is no room. */
function factoryFit(f: Factory, item: Bar): 'pair' | 'stock' | 'pass' | null {
  // Rock never enters: it waits on the belt, so a line carrying rock needs it kept off.
  if (FACTORY_REFUSE_ROCK && item.ore === ROCK && item.alloy === undefined) return null;
  if (pairable(item)) {
    if (f.pairs.length < FACTORY_PAIRS && partnerIndex(f.stock, item) >= 0) return 'pair';
    if (f.stock.length < FACTORY_STOCK) return 'stock';
  }
  return f.ready.length < FACTORY_READY ? 'pass' : null;
}

/** Smoothing per intake for the "smelt it first" hint (a few seconds of raw-only intake). */
const RAW_ALPHA = DT / 2;

function factoriesTick(s: State) {
  for (const f of factories(s)) {
    // Intake: as many items per tick as there is room for, one per input belt in turn. Paired
    // bars pair on arrival or wait in the stock; everything else passes straight through.
    const inputs = inputsOf(s, f.id);
    const n = inputs.length;
    let took = true;
    let raw = false,
      bar = false;
    while (took && n) {
      took = false;
      for (let k = 0; k < n; k++) {
        const idx = (f.rr + k) % n;
        const belt = inputs[idx].out!;
        const front = waiting(belt);
        if (!front) continue;
        const fit = factoryFit(f, classOf(front.ores[0], front));
        if (!fit) continue;
        const item = takeFront(belt);
        if (fit === 'pair') f.pairs.push([unstock(f, partnerIndex(f.stock, item)), item]);
        else if (fit === 'stock') f.stock.push({ ...item, t: s.tick });
        else f.ready.push(item);
        if (item.mult === 1) raw = true;
        else bar = true;
        f.rr = (idx + 1) % n;
        took = true;
        break;
      }
    }
    if (raw || bar) f.rawT += ((raw && !bar ? 1 : 0) - f.rawT) * RAW_ALPHA;
    // Bars that waited while the pairs were full pair up as soon as there is room.
    for (let i = 0; i < f.stock.length && f.pairs.length < FACTORY_PAIRS; ) {
      const j = partnerIndex(f.stock.slice(i + 1), f.stock[i]);
      if (j < 0) {
        i++;
        continue;
      }
      const b = unstock(f, i + 1 + j);
      f.pairs.push([unstock(f, i), b]);
    }
    // A bar that waited out LONE_WAIT takes any partner; with none it passes on, oldest first,
    // so nothing waits for ever.
    while (f.stock.length && s.tick - f.stock[0].t >= LONE_WAIT * TICK_HZ) {
      const j = partnerIndex(f.stock.slice(1), f.stock[0], true);
      if (j >= 0 && f.pairs.length < FACTORY_PAIRS) {
        const b = unstock(f, 1 + j);
        f.pairs.push([unstock(f, 0), b]);
      } else if (f.ready.length < FACTORY_READY) f.ready.push(unstock(f, 0));
      else break;
    }
    // The worker: one alloy at a time; leftover time carries into the next.
    let budget = DT;
    while (budget > 1e-9) {
      if (!f.job) {
        if (!f.pairs.length || f.ready.length >= FACTORY_READY) break;
        f.job = { pair: f.pairs.shift()!, left: factoryTime(f.level) };
      }
      const use = Math.min(budget, f.job.left);
      f.job.left -= use;
      budget -= use;
      if (f.job.left > 1e-9) continue;
      if (f.ready.length >= FACTORY_READY) break;
      const alloy = alloyOf(f.job.pair);
      f.ready.push(alloy);
      s.events.push({ type: 'alloy', id: f.id, ore: alloy.ore, alloy: alloy.alloy! });
      f.job = null;
    }
  }
}

/** Is the factory taking in only raw chunks (it needs bars: "smelt it first")? */
export const factoryNeedsBars = (f: Factory) => f.rawT > 0.6;

function pressureTick(s: State) {
  for (const m of s.machines) {
    const held = !!m.out && m.out.to.kind !== 'dock' && !!waiting(m.out);
    m.wait = held ? m.wait + 1 : 0;
    // Waiting out one load cycle at the next machine is normal; longer means held downstream.
    m.heldAgo = m.wait > LOAD_TICKS + 1 ? 0 : Math.min(HELD_WINDOW, m.heldAgo + 1);
    if (m.heldAgo < HELD_WINDOW && !held) continue;
    if (m.wait >= DOWNSTREAM_TICKS) sample(m, false, JAM_TICK_ALPHA);
  }
}

/** A front that waits this long (about 0.4 s) is held up downstream, not just between loads. */
export const DOWNSTREAM_TICKS = 12;
/** A belt whose front waited at a machine within this many ticks (1 s) is held downstream. */
const HELD_WINDOW = TICK_HZ;

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
  useSector(s.seed, s.sector);
  s.tick++;
  slotsTick(s);
  laserTick(s);
  drillsTick(s);
  loadBelts(s);
  moveBelts(s);
  crossTick(s);
  smeltersTick(s);
  factoriesTick(s);
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
    for (const it of m.out?.items ?? []) for (const ore of it.ores) v += itemValue(ore, it);
    if (m.kind === 'drill') v += m.buffer.reduce((a, o) => a + ORES[o].value, 0);
    else if (m.kind === 'factory') {
      // Bars waiting count as bars; pairs already made count as the alloy they become.
      for (const b of [...m.stock, ...m.ready]) v += itemValue(b.ore, b);
      for (const pair of m.job ? [...m.pairs, m.job.pair] : m.pairs) v += alloyOf(pair).v!;
    } else {
      v += m.queue.reduce((a, o) => a + ORES[o].value, 0) * (BAR_VALUE / 2);
      if (m.job) v += ORES[m.job.ore].value * (m.job.pair ? BAR_VALUE : LONE_BAR_VALUE);
      for (const b of m.ready) v += itemValue(b.ore, b);
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
  buildFactory,
  route,
  upgrade,
  widen,
  sell,
  moveDrill,
  moveSmelter,
  unlock,
  upgradeHub,
  setCrossings,
  setRockPrices,
  setFactories,
  bend,
} as const;

export type CommandName = keyof typeof COMMANDS;
/** [tick at which it was applied (before the next step), name, arguments]. */
export type LoggedCommand = [number, CommandName, unknown[]];

export function applyCommand(s: State, name: CommandName, args: unknown[]): unknown {
  return (COMMANDS[name] as (s: State, ...a: unknown[]) => unknown)(s, ...args);
}

/** Re-run a command log from a fresh seed (and its sector, if any) up to `untilTick`. */
export function replay(
  seed: number,
  log: LoggedCommand[],
  untilTick: number,
  sector = false
): State {
  const s = freshState(seed, sector);
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
